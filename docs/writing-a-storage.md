---
description: "A storage keeps one complete inbox snapshot, replaced atomically by one writer. The InboxStorage contract, what a read and a write must promise, and the conformance suite for a storage of your own."
---

# Writing a storage

A storage keeps the persistent part of the inbox across restarts: one complete snapshot, replaced atomically, by one writer. [Silo](/storage/silo) is one over MMKV or AsyncStorage; any key-value store can back one.

```ts
import type { InboxStorage } from "@priemskiyyy/junction";

const memory = new Map<string, string>();

export const mapStorage: InboxStorage = {
  read: () => {
    const text = memory.get("junction");

    if (text === undefined) {
      return undefined;
    }

    return JSON.parse(text);
  },
  replace: (snapshot) => {
    memory.set("junction", JSON.stringify(snapshot));
  },
};
```

## The contract

- `read()` returns the stored snapshot, `undefined` or `null` for none, as a value or a promise, so a key-value store's missing key needs no translation. A throw or a rejection is a **failed read**, never an empty inbox: Junction blocks the storage rather than start empty and write over what it could not read.
- `replace(snapshot, { id })` replaces the whole snapshot atomically: a crash leaves the old one or the new one, never half of each. A rejection may still have committed. `id` names the operation, so a retry of the same snapshot carries the same id and a backend can recognize a write it already applied.
- `dispose()`, optional, releases what the storage holds. Junction calls it once, when it is disposed and no read or write is in flight, even one that outlived its timeout.

Junction serializes the writes and coalesces the changes made while one is in flight, so every write carries every earlier change. It never writes from two places: only one Junction may write to one storage, which is documented, not detected.

Every call has a bound, `timeout.storage`: a read past it blocks the storage, and a write past it counts as failed and stays the one write in flight.

## The snapshot

`{ format: "junction.inbox", version: 1, revision, timestamp, intents, ledger }`, plain JSON. Store it as it is; Junction validates what it reads back strictly, and a malformed snapshot, or one whose fields throw when read, blocks the storage as `STORAGE_CORRUPT`, a newer version as `STORAGE_VERSION_UNSUPPORTED`.

## Test it

`testInboxStorage` from `@priemskiyyy/junction/testing` holds a storage to the contract through real Junctions and restarts over the same backend: an empty start, an intent that survives, an acknowledged one that stays gone, an interrupted lease, and writes that never overlap.

<!-- snippet: fragment -->

```ts
import { testInboxStorage } from "@priemskiyyy/junction/testing";

testInboxStorage({
  name: "map",
  createFixture: () => ({ storage: mapStorage, reopen: () => mapStorage }),
});
```

`reopen` returns another storage over the same backend, as a restarted app would open it. `createMockStorage` from `@priemskiyyy/junction/mock` holds, fails and releases writes on command, for testing your app's persistence.
