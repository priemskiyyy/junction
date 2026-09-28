---
description: "Keep intents across a restart: the storage contract, the three moments a persistent intent is written, what a restart restores, a storage that cannot be trusted, and the bound on every storage call."
---

# Persistence

By default the inbox lives in memory: an intent does not survive the process. That is enough until an entry point arrives once and its intent must wait, and the operating system ends your app meanwhile: a mention pressed while signed out, and the user switches to a password manager, is gone on the next launch.

Persistence keeps such intents. It is chosen per intent, with `persist: { schema }`, over one `storage` for the Junction:

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { z } from "zod";

const OpenComment = z.object({ commentId: z.string().min(1) });

export const app = new Junction({
  intents: {
    openComment: intent(OpenComment, {
      account: true,
      persist: { schema: OpenComment },
    }),
  },
  identity,
  storage,
});
```

`persist.schema` validates the stored payload when it comes back, and must give it back unchanged: an admission it would refuse or change, such as a stored schema that strips a field, is `rejected` as `invalid-payload` at once rather than after a restart. A persistent intent without `storage` is misconfiguration. Memory intents never touch storage.

## The storage

A storage is `{ read, replace, dispose? }`: one complete snapshot, replaced atomically, by one writer. [Silo](/storage/silo) provides one over MMKV or AsyncStorage, and [Writing a storage](/writing-a-storage) describes the contract. Only one Junction may write to a storage.

The snapshot holds each persistent intent's id, name, version, payload, account binding, receipt time, deadline, provenance, attempts and state, and the ledger of their settled occurrences. Never registrations, handlers, SDK objects, raw URLs, tokens or thrown values.

## When it is written

- **Admission.** A persistent admission answers `accepted` with `durability: "committed"` once the write holding it landed, and `unconfirmed` when that write failed, which may still have committed.
- **Lease.** A persistent handler runs only after the write holding its lease committed, and only if its owner, identity and deadline still hold then. A failed lease write runs nothing and returns the intent to waiting.
- **Settlement.** An outcome is final in memory at once: the intent leaves the inbox and its occurrence becomes a tombstone, so nothing runs twice. The write follows; when it fails, `junction.storage.flush()` retries the write, never the handler.

While the last write is unconfirmed, persistent intents wait with `storage` instead of leasing, so a failing storage is never hammered; memory intents run.

## What a restart restores

`start()` reads the storage while the sources attach. What arrives meanwhile waits for the stored inbox, keeping its receipt time, and is admitted after it. A receipt stamped before the storage restored, a launch read that lands later included, is clamped to the stored clock, so a clock set back never expires the link that opened the app.

- A waiting intent comes back waiting, with its id, payload, account and deadline.
- An intent whose lease was stored comes back `interrupted` with `PROCESS_RESTARTED`: its effect may have happened, so Junction never replays it, and `retry(id)` is your call.
- An intent its definition no longer accepts, another `version` or a payload `persist.schema` refuses, is quarantined with a diagnostic; its occurrence stays a tombstone.
- Deadlines survive unchanged. Junction time starts no earlier than the last write's and moves on from there, so a clock set back since then extends no deadline and stops none.

## A storage that cannot be trusted

A failed read, a corrupt snapshot or one from a newer version **blocks** the storage instead of starting empty. While blocked, persistent admissions are refused as `storage-unavailable` and memory intents run. `junction.storage.reset()` replaces the stored inbox with an empty one and resumes; it is your decision, since the stored intents are lost.

`junction.storage.status` reads `none`, `idle`, `hydrating`, `ready` with its `durability` (`committed`, `pending` or `unconfirmed`), `blocked` with its error, or `disposed`.

## The bound on every call

Every storage call has a bound, `timeout.storage`, 10 seconds by default:

- a **read** past it blocks the storage, as a failed read does, so a storage that never answers cannot hold every launch link back;
- a **write** past it counts as failed, since it may still commit. Persistent intents wait with `storage` and memory intents run, and the late write stays the only one in flight, so a newer snapshot never lands before an older one.

## Crash matrix

| The process ends                       | After the restart                                                  |
| -------------------------------------- | ------------------------------------------------------------------ |
| before the event reached JavaScript    | lost; the provider may or may not deliver it again                 |
| after a memory-only admission          | lost                                                               |
| before the admission write committed   | absent; a durable sender retries until it gets a committed receipt |
| after admission, before the lease      | waiting, with the same id, account and deadline                    |
| after the lease write                  | interrupted, `PROCESS_RESTARTED`                                   |
| during the handler or after its effect | interrupted, never replayed by itself                              |
| after the terminal write               | ended; a replayed occurrence is a duplicate of it                  |

No ordering of local storage and arbitrary effects gives exactly-once side effects. Where it matters, make the effect idempotent.
