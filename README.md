# Junction

**Typed application intents from every entry point, for React Native and TypeScript.**

Junction turns Universal Links, App Links, custom schemes, deferred links, notification presses and application dispatches into validated, typed intents. It captures them once, at bootstrap, and lets each feature consume the intents it owns, when it is mounted, ready and signed in to the right account.

## npm preview

The initial npm preview uses the `next` dist-tag:

```sh
pnpm add @priemskiyyy/junction@next @priemskiyyy/junction-react@next @priemskiyyy/junction-react-native@next zod
```

The preview includes the core, React binding and React Native Linking source.
Additional sources are available as source code while device verification
continues. Native delivery has not been certified on physical devices; see
[verification](docs/verification.md). The API may change during the preview.

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { linking } from "@priemskiyyy/junction-react-native";
import { Linking } from "react-native";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(
      z.object({ workspaceId: z.string(), documentId: z.string() }),
    ),
  },
  sources: { links: linking({ sdk: Linking }) },
  routes: ({ from }) => ({
    documentUrl: from.links.url({
      url: "https://app.example.com/workspaces/:workspaceId/documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({
        workspaceId: params.workspaceId,
        documentId: params.documentId,
      }),
    }),
  }),
});

junction.start();
```

```tsx
import { useIntent } from "@priemskiyyy/junction-react";

const WorkspaceIntents = ({ workspaceId }: { workspaceId: string }) => {
  const navigation = useNavigation();

  useIntent(
    "openDocument",
    ({ documentId }, { commit }) =>
      commit(() => navigation.navigate("Document", { documentId })),
    {
      match: (payload) => payload.workspaceId === workspaceId,
      ready: navigation.isReady(),
    },
  );

  return null;
};
```

## Why not handle `Linking` directly

Reading a URL is easy. What surrounds it is where applications break:

- **Links arrive before the app is ready.** A cold-start link waits in a bounded inbox until the feature that owns it is mounted, ready and signed in, and expires if it never is.
- **Ownership is explicit.** `match` says which consumer owns an intent and `ready` says whether it can run now. An unready owner is never robbed by another consumer, and two owners are an ambiguity Junction reports instead of a race it resolves by mount order.
- **Validation is the boundary.** Every intent passes its schema, and URLs pass a strict parser that refuses encoded separators, dot segments and host spoofing.
- **Work belongs to its attempt.** An account switch, an unmount or a timeout invalidates a running handler, and `commit()` guards the final navigation so a stale `await` cannot act.
- **Honest outcomes.** Acknowledged, rejected, retried, failed, interrupted or expired, and a repeated tap is never mistaken for a duplicate.
- **Provider-native escape hatch.** `junction.source(name).native` is your SDK, fully typed.

## What Junction is not

Junction does not navigate, create or host links, attribute installs, initialize SDKs, grant consent, sign anyone in or configure native link handling. Those stay with your router, your provider SDKs and your native project.

## Status

Version 0.1.0 is the initial npm preview for the packages listed above. The catalog also includes sources and integrations still in development:

| Package                                    | What it is                                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `@priemskiyyy/junction`                    | The core: intents, routes, the inbox, ownership, delivery, identity, persistence and diagnostics, with its `mock` and `testing` entries |
| `@priemskiyyy/junction-react`              | `JunctionProvider`, `useIntent`, `useInbox`, `useSourceStatus` and `useJunction`                                                        |
| `@priemskiyyy/junction-react-native`       | Universal Links, App Links and custom schemes through React Native's `Linking` or `expo-linking`                                        |
| `@priemskiyyy/junction-branch`             | Branch links, deferred ones included                                                                                                    |
| `@priemskiyyy/junction-appsflyer`          | AppsFlyer 7 deep links                                                                                                                  |
| `@priemskiyyy/junction-appsflyer-v6`       | AppsFlyer 6 deep links                                                                                                                  |
| `@priemskiyyy/junction-adjust`             | Adjust deferred deep links                                                                                                              |
| `@priemskiyyy/junction-detour`             | Detour links, deferred ones included                                                                                                    |
| `@priemskiyyy/junction-expo-notifications` | Notification presses through expo-notifications                                                                                         |
| `@priemskiyyy/junction-expo-quick-actions` | Home screen shortcuts through expo-quick-actions                                                                                        |
| `@priemskiyyy/junction-silo`               | Persistence over a Silo value, on MMKV or AsyncStorage                                                                                  |

The guides live in `docs/` (`pnpm dev:docs`), and the Intent Lab, on the web and on Expo, in `examples/` (`pnpm dev`). `pnpm check:release` runs every check a release needs.

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
```

`CONTRIBUTING.md` describes the layout, the style and the source rules.

## License

MIT
