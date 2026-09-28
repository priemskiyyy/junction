---
description: "junction.diagnostics is a passive view for devtools and logs: a snapshot of the lifecycle, sources, consumers and intents, and a typed timeline of events that never carries a payload, a URL or an account."
---

# Diagnostics

`junction.diagnostics` shows what Junction is doing without changing it: observing it attaches, claims and runs nothing.

## The snapshot

```ts
const snapshot = junction.diagnostics.get();

console.log(snapshot.state, snapshot.identity.status, snapshot.running);

const stop = junction.diagnostics.subscribe(() => {
  console.log(junction.diagnostics.get().intents.length);
});
```

| Field       | Holds                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `state`     | `idle`, `started` or `disposed`                                                                 |
| `identity`  | `{ status }`, never the account                                                                 |
| `storage`   | the storage's status                                                                            |
| `sources`   | each source's name, `adapter: { name }` and status                                              |
| `consumers` | each consumer's id, `name`, `intent: { name }` and whether it is a `fallback`                   |
| `intents`   | each open intent's id, name, state, attempts, and why it waits                                  |
| `running`   | the attempt holding the execution slot, and whether it is `blocked` past its timeout, or `null` |

The snapshot is frozen and computed on the first `get()` after a change; subscribers are notified once per microtask, however many changes it held.

## Events

`junction.diagnostics.events.subscribe(listener)` delivers every event as it happens, in order. An event is `{ type, source, intent, timestamp, context }`: `source` and `intent` name what it is about, and `context` is typed by `type`, so narrowing the type types the context:

```ts
const stop = junction.diagnostics.events.subscribe((event) => {
  if (event.type === "intent waiting") {
    console.debug(event.intent?.id, event.context.reason);
  }

  if (
    event.type === "attempt invalidated" &&
    event.context.reason === "interrupted"
  ) {
    console.debug(event.context.code);
  }
});
```

`JunctionDiagnosticEvent<"retry scheduled">` names one member of the union. An event with nothing to add has `context: null`.

| Type                                                                        | Context                                                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `junction started`, `junction disposed`                                     | none                                                                                                         |
| `identity changed`                                                          | `{ status }`                                                                                                 |
| `source attached`, `source failed`, `source error`, `source dispose failed` | none                                                                                                         |
| `initial read settled`                                                      | `{ initial, late }`: how the launch read went, and whether past its timeout                                  |
| `callback ignored`                                                          | none: a provider called back after its source stopped                                                        |
| `observation ignored`                                                       | `{ reason }`: `no-route` or `owned-by-other-source`                                                          |
| `observation rejected`                                                      | `{ reason }`, a rejection reason                                                                             |
| `intent accepted`, `intent duplicate`                                       | none                                                                                                         |
| `intent waiting`                                                            | `{ reason, consumers }`: the waiting reason and how many consumers it is about                               |
| `attempt started`                                                           | `{ attempt: { id, number }, consumer: { id } }`                                                              |
| `attempt invalidated`                                                       | `{ reason, code }`: `interrupted` with its code, or `expired` or `cancelled`                                 |
| `effect committed`, `execution blocked`                                     | none                                                                                                         |
| `intent acknowledged`                                                       | `{ ignored }`: what the handler did after its commit, which the latch ignored: `threw`, `answered` or `null` |
| `intent rejected`                                                           | `{ reason }`, the handler's                                                                                  |
| `intent failed`, `intent interrupted`                                       | `{ code }`                                                                                                   |
| `retry scheduled`                                                           | `{ after }`, in milliseconds                                                                                 |
| `intent expired`, `intent cancelled`                                        | `{ running }`: whether a handler was running, so its effect may have happened                                |
| `intent quarantined`                                                        | `{ reason }`: why a stored intent was set aside                                                              |
| `storage hydrated`                                                          | `{ restored, quarantined }`, counts                                                                          |
| `storage blocked`                                                           | `{ code }`                                                                                                   |
| `storage write failed`, `storage reset`, `storage dispose failed`           | none                                                                                                         |

`attempt started` marks the lease, so a persistent handler runs once that lease is stored. A lease undone before its handler runs, by a failed lease write, a change of identity or a consumer that appeared meanwhile, is followed by `intent waiting` when the intent must wait, or directly by the next `attempt started`, and the next lease reuses its number.

Events are assembled only while a listener is subscribed. A listener that throws never stops another one or Junction itself: its error is rethrown in a microtask, as an uncaught error, so your error reporting sees it. Diagnostics end with the Junction: a teardown that fails during `dispose()` is recorded, and one that fails later, a `dispose` that rejects or a storage disposed once its write lands, is contained silently.

## What it never carries

No payload, URL, account id or provider error reaches a diagnostic: events name what happened with reasons, codes, counts and ids, and the snapshot's source and storage statuses keep each error's code and message but never its `cause`, which `junction.source(name).status` and `junction.storage.status` keep for your app. That makes them safe to send to a crash reporter or a remote log. The inbox, which carries payloads, is not.
