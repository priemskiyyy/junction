---
description: "A consumer is the code that owns an intent: a screen through useIntent, or a service through junction.subscribe. Its match, ready, fallback, scope and timeout decide when it runs."
---

# Local consumers

A consumer is the code that owns an intent while it is mounted: usually a screen, through [`useIntent`](/react), or a service, through `junction.subscribe()`. Registering a consumer delivers nothing at once: a later scheduler turn decides.

```ts
const registration = junction.subscribe(
  "openDocument",
  ({ documentId }, { commit }) =>
    commit(() => navigation.openDocument(documentId)),
  {
    name: "Workspace screen",
    match: ({ workspaceId }) => workspaceId === currentWorkspaceId,
    ready: () => navigation.isReady(),
  },
);

const stopWatching = workspaceStore.subscribe(junction.refresh);
```

## Options

| Option     | Default                    | Meaning                                                                                                  |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `match`    | always                     | Whether this consumer owns the intent. Synchronous and pure.                                             |
| `ready`    | `true`                     | Whether the owner can run it now: a boolean or a synchronous getter. A not-ready owner holds the intent. |
| `fallback` | `false`                    | A fallback owns an intent only when no primary consumer matches it.                                      |
| `scope`    | none                       | An opaque revision you supply: changing it invalidates the running attempt, as a new React `key` would.  |
| `timeout`  | the Junction's `execution` | How long one attempt may run before it is invalidated.                                                   |
| `name`     | none                       | A label for diagnostics, never identity or precedence.                                                   |

## Getters are not reactive

`match` and `ready` may close over state Junction does not observe. When that state changes, call `junction.refresh()`: it evaluates every consumer again and checks the running attempt's owner at once. The React binding calls it after every commit, so a screen's latest props are what count.

They decide from the payload and your own state, never from Junction's inbox or diagnostics. Junction evaluates them again after it publishes a lease, so a `match` that reads `junction.inbox` sees its own intent leased and refuses it, and with a refresh on every change it leases the intent again without end.

## Updating and disposing

`registration.update(handler, options)` replaces the handler and every option at once, so an option it leaves out returns to its default: one set of defaults serves both calls. The registration keeps its id.

- A new handler never invalidates the running attempt: that attempt keeps the handler it started with, and the next one uses the new handler.
- A changed `scope`, or a `match` or `ready` that no longer holds, invalidates the running attempt.
- `dispose()` is idempotent and invalidates a running attempt the consumer owned. `update()` after `dispose()` throws `INVALID_CONFIGURATION`, as `subscribe()` and `update()` do for a `timeout` outside its range.

## Where to register

Register a consumer where the intent can be fulfilled, for as long as it can be. A screen that shows a document owns `openDocument` for its workspace while it is mounted; a shell that is mounted signed in or not can own an intent as a `fallback`, so it waits for sign-in instead of for a screen. [Ownership and readiness](/ownership-and-readiness) describes how the owner is chosen.
