# @priemskiyyy/junction

Typed application intents from every entry point, for React Native and TypeScript. The core captures what your sources observe (links, deferred links, notification presses, quick actions, your own dispatches), validates it into typed intents, holds them in a bounded inbox, and delivers each one to the single consumer that owns it, once that consumer is ready and the right account is signed in.

No dependencies, ESM only, no side effects on import.

## Installation

```sh
pnpm add @priemskiyyy/junction@next @priemskiyyy/junction-react-native@next zod
```

## Use it

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { linking } from "@priemskiyyy/junction-react-native";
import { Linking } from "react-native";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(
      z.object({
        workspaceId: z.string(),
        documentId: z.string(),
        accountId: z.string().optional(),
      }),
      { account: ({ accountId }) => accountId },
    ),
  },
  identity,
  sources: { links: linking({ sdk: Linking }) },
  routes: ({ from }) => ({
    documentUrl: from.links.url({
      url: "https://app.example.com/workspaces/:workspaceId/documents/:documentId",
      intent: "openDocument",
      payload: ({ params, query }) => ({
        workspaceId: params.workspaceId,
        documentId: params.documentId,
        accountId: query.single("account"),
      }),
    }),
  }),
});

junction.start();

junction.subscribe(
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

    return commit(() => navigation.openDocument(documentId));
  },
  { match: ({ workspaceId }) => workspaceId === currentWorkspaceId },
);
```

## Intents

`intent(schema, options?)` declares one intent from a Standard Schema (Zod, Valibot, ArkType) that validates synchronously and produces a JSON object. The schema's input is what routes and `dispatch` provide; its output is what consumers receive. `expires: { in }` bounds how long an intent may wait (ten minutes by default), `attempts` how many attempts it may take (three), and `account` makes it account-bound: a function names the account the payload targets, and without a target, as with `true`, it binds to whoever is signed in when it is accepted, or at its first attempt while nobody is.

## Sources and routes

A source is a plain `{ name, native, resource, attach }` over an SDK your application set up; the adapter packages export one per provider. Routes turn a source's input into an intent's payload, keyed by route id:

- `from.<source>.url({ url, intent, payload })` for sources whose input carries a URL. The pattern holds the scheme, host, optional port and path; each `:name` segment captures one segment into typed `params`, and `query.single(key)`, `query.all(key)` and `query.has(key)` read the query explicitly.
- `from.<source>.event({ intent, match, payload })` for any input.

A route's `payload` builds the payload before validation: a missing field fails to compile, and the schema proves the values. Exactly one route may match an input; two are an ambiguity, and a URL whose origin another source's routes own is ignored.

The URL grammar is strict on purpose: no user information, no dot segments raw or encoded, no encoded separators or control characters in a segment, strict UTF-8 percent-decoding, exact host and port comparison, and an 8 KiB bound. A route parameter can therefore never become `..` or smuggle a `/` into an API path.

## Consumers

`junction.subscribe(name, handler, options)` registers a consumer:

- `match(payload)` decides ownership, `ready` whether the owner can run now. An unready owner keeps its intents; a ready fallback never steals them.
- `fallback: true` makes the consumer own an intent only when no primary matches it.
- Two matching owners are an ambiguity the inbox reports as `ambiguous-consumer`, never a race settled by mount order.
- `scope` is your execution scope: changing it invalidates the running attempt.
- `update(handler, options)` takes what `subscribe` took and replaces everything at once, so an option it leaves out returns to its default; `dispose()` ends the consumer.
- `junction.refresh()` evaluates every consumer's `match` and `ready` again, for closures that read state Junction does not observe: `workspaceStore.subscribe(junction.refresh)`. The React binding calls it after every commit.
- `match` and `ready` decide from the payload and your own state, never from Junction's inbox or diagnostics: they are evaluated again after a lease is published, so one that reads the inbox refuses its own lease.

## Handlers and outcomes

A handler receives the frozen payload and an execution. Returning normally acknowledges; `reject(reason)` rejects; `retry({ after })` asks for another attempt; a throw fails the attempt without retrying. `commit(effect)` runs the final synchronous effect once, only if the attempt is still current, and a committed effect counts as handled even when it unmounts its own consumer; an effect that throws is rethrown and leaves the intent interrupted with `EFFECT_UNCERTAIN`. `signal` aborts when the attempt is invalidated or its answer is applied, a moment after the handler returns, and from then on `assertCurrent()` and `commit` throw `STALE_EXECUTION`.

One handler runs at a time. An attempt is invalidated when its consumer is disposed, stops matching or being ready, changes scope, when the identity changes, when the intent expires or is cancelled, or when it outlives its timeout.

## Identity and accounts

`identity` is your read-only identity store, `{ status: "restoring" | "anonymous" | "authenticated", account }`, and only account-bound intents need it: an intent that merely needs someone signed in is readiness, `ready: () => session.get().status === "authenticated"`. An account-bound intent waits while the identity restores, while nobody is signed in, or while another account is: Junction never switches accounts, and an account in a link is a target, not authority. It is declared once on the intent, so no consumer, fallbacks included, can run it for the wrong account, and a retry keeps the account it started for. Every identity change interrupts the running attempt, and the execution's `account` stays the one it started under.

## The inbox and recovery

`junction.inbox` holds every intent that has not ended, with why it waits. `junction.retry(id, { after })` runs a failed or interrupted intent again with the same id, payload, account and deadline; `junction.cancel(id)` ends one. The inbox holds at most 32 intents and refuses more rather than evicting accepted work.

## Persistence

Intents live in memory by default, so a process that ends takes them with it. To keep one across restarts, give the Junction a `storage` and the intent `persist: { schema }`, the schema of its payload as stored:

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { z } from "zod";

const OpenDocument = z.object({
  workspaceId: z.string(),
  documentId: z.string(),
});

export const junction = new Junction({
  intents: {
    openDocument: intent(OpenDocument, { persist: { schema: OpenDocument } }),
  },
  storage,
});
```

- A storage is `{ read, replace, dispose? }`: one complete snapshot, replaced atomically, by one writer. Only one Junction may write to it.
- A persistent admission answers `committed` once its write landed, and `unconfirmed` when the write failed, which may still have committed.
- A persistent handler runs only after its lease is stored, and only if its consumer is still the owner, the identity still matches and the intent has not expired. An intent whose lease was stored when the process ended comes back `interrupted` with `PROCESS_RESTARTED`: its effect may have happened, so Junction never replays it, and `retry(id)` is your decision.
- A settled outcome is final in memory at once. When its write fails, `junction.storage.status` reads `unconfirmed` and `junction.storage.flush()` retries the write, never the handler; until a write succeeds, persistent intents wait with `storage`.
- On restart, what the sources observe while the stored inbox restores waits for it. A corrupt or newer snapshot, or a failed read, blocks the storage instead of starting empty: persistent intents are refused with `storage-unavailable` until `junction.storage.reset()`. A stored intent its definition no longer accepts (another `version`, a payload `persist.schema` refuses) is quarantined with a diagnostic.
- Every storage call has a bound, `timeout.storage`, 10 seconds by default. A read past it blocks the storage, as a failed read does, so a storage that never answers cannot hold every intent back. A write past it counts as failed, since it may still commit: persistent intents wait with `storage` and memory intents run, and the late write stays the only one in flight, so writes never overtake each other.
- Deadlines survive a restart unchanged. Junction time starts no earlier than the last write's and moves on from there, so a clock set back since then extends no deadline and stops none.
- `persist.schema` validates the payload as stored. A schema whose input differs from its output, such as one with a `transform`, needs a separate stored schema; an admission `persist.schema` would refuse is rejected at once, not after a restart.
- No ordering of local storage and arbitrary effects gives exactly-once side effects. Where it matters, make the effect idempotent.

## Lifecycle

- `start()` attaches every source synchronously, restores the stored inbox, and resolves once the storage and each launch read settled or timed out. It never rejects and never waits for a deferred link.
- `dispatch(name, input, options?)` admits an intent your application raises itself; `inspect(source, input)` explains what an input would become without admitting it.
- `dispose()` detaches every source, invalidates the running attempt and silences late callbacks. It never shuts an SDK down.
- `now` is the one clock Junction reads, `Date.now` by default.

## Errors

A `JunctionError` carries a `code`. Only misconfiguration throws, as `INVALID_CONFIGURATION`: an undeclared name, an option outside its range, or `update()` on a disposed consumer; an execution used after its lease ended throws `STALE_EXECUTION` into its handler, a second commit `ALREADY_SETTLED`, and `query.single` on a repeated key `AMBIGUOUS_QUERY` into its route. Everything else answers with a result: admissions, recovery results, and the inbox's failed and interrupted entries.

## Diagnostics

`junction.diagnostics` is a passive view: a frozen snapshot of the lifecycle, the identity, every source, consumer and intent, and the running attempt, and a timeline of events such as `intent accepted` or `attempt invalidated`. Each event's `context` is typed by its `type`, so narrowing the type gives its reason, code or counts: `JunctionDiagnosticEvent<"intent waiting">` names one. Observing it attaches, claims and runs nothing, and it never carries a payload, a URL or an account.

## Testing

`@priemskiyyy/junction/mock` exports `createMockSource`, which emits what a test says, can hold or fail its launch read, push while attaching and fail its cleanup, and `createMockStorage`, which holds, fails or half-commits any write and hands a restart what it committed. `@priemskiyyy/junction/testing` exports `testIncomingSource` and `testInboxStorage`, the conformance suites every source and every storage runs; they need Vitest.

## License

MIT
