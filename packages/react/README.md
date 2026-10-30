# @priemskiyyy/junction-react

React bindings for Junction: a provider that publishes one Junction, `useIntent()` to make a mounted component the consumer of an intent, and `useInbox()` and `useSourceStatus()` to observe the inbox and the sources. Observing never starts a source, claims an intent or runs a handler. React Native uses this package as it is.

## Installation

```sh
pnpm add @priemskiyyy/junction@next @priemskiyyy/junction-react@next
```

## Set up

Create the Junction once, register its type, start it, and publish it:

<!-- snippet: fragment -->

```tsx
import { Junction } from "@priemskiyyy/junction";
import { JunctionProvider } from "@priemskiyyy/junction-react";

export const junction = new Junction({ intents, identity, sources, routes });

declare module "@priemskiyyy/junction-react" {
  interface Register {
    junction: typeof junction;
  }
}

// Never rejects: it resolves once every launch read settled or timed out.
junction.start();

export const Root = () => (
  <JunctionProvider junction={junction}>
    <Application />
  </JunctionProvider>
);
```

Whoever constructs the Junction starts and disposes it. The provider does neither, so Strict Mode's double mount and every unmount leave it alone. Without the `Register` augmentation, TypeScript refuses a typed Junction on the provider, so the registration cannot be forgotten.

## Consume an intent

```tsx
import { useIntent } from "@priemskiyyy/junction-react";

export const WorkspaceIntents = ({ workspaceId }: { workspaceId: string }) => {
  const navigation = useNavigation();

  useIntent(
    "openDocument",
    async ({ documentId }, { account, signal, reject, commit }) => {
      const access = await api.checkAccess({
        documentId,
        account: account.id,
        signal,
      });

      if (!access.allowed) {
        return reject("not-authorized");
      }

      return commit(() => navigation.navigate("Document", { documentId }));
    },
    { match: (payload) => payload.workspaceId === workspaceId },
  );

  return null;
};
```

- The handler, `match` and `ready` are read from the latest commit whenever Junction needs them, so an inline handler needs no `useCallback`, and a render React abandons or suspends never becomes the live handler.
- After every commit the hook asks Junction to evaluate `match` and `ready` again. A consumer that starts matching takes its waiting intent, and a running attempt whose owner stops matching or being ready is interrupted at once.
- `scope`, `fallback`, `timeout` and `name` identify the consumer. Changing one registers it anew, which interrupts its running attempt, as a new `key` would.
- Unmounting interrupts the running attempt and aborts its signal. `commit()` refuses once the attempt is no longer current, so a handler that resolves after its screen is gone cannot navigate.
- Nothing is registered or run during render or on the server, and delivery always waits for Junction's next scheduler turn, so Strict Mode handles an intent once.

## Observe

```tsx
import { useInbox, useSourceStatus } from "@priemskiyyy/junction-react";

export const InboxBadge = () => {
  const failed = useInbox(
    (inbox) =>
      inbox.filter(({ state }) => state === "failed" || state === "interrupted")
        .length,
  );

  const links = useSourceStatus("links");

  return (
    <span>
      {failed} failed, links {links.state}
    </span>
  );
};
```

`useInbox()` returns every intent that has not ended; a selector renders again only when its selection changes by `Object.is`. `useSourceStatus(name)` returns one source's status: `idle`, `attached` with how its launch read went, `failed` or `disposed`.

## Server rendering

On the server and during hydration `useInbox()` reads an empty inbox and `useSourceStatus()` reads `idle`, so the server's markup and the client's first render agree. The client then renders the real values. `useIntent()` registers nothing on the server.

## API

| Export                                                                                                                                   | What it is                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `JunctionProvider`                                                                                                                       | Publishes one Junction to the tree below.                           |
| `useJunction()`                                                                                                                          | The nearest provider's Junction, for `dispatch`, `retry`, `cancel`. |
| `useIntent(name, handler, options?)`                                                                                                     | Makes the component the consumer of one intent while mounted.       |
| `useInbox()`, `useInbox(selector)`                                                                                                       | The inbox, or one selection of it.                                  |
| `useSourceStatus(name)`                                                                                                                  | One source's status.                                                |
| `Register`                                                                                                                               | The interface to augment with `junction: typeof junction`.          |
| `RegisteredJunction`, `RegisteredIntentName`, `RegisteredPayload`, `RegisteredExecution`, `RegisteredInboxEntry`, `RegisteredSourceName` | The types the registration resolves to.                             |

A hook outside a provider throws a `JunctionError` with the code `INVALID_CONFIGURATION`.

## License

MIT
