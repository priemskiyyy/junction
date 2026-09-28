# @priemskiyyy/junction-silo

Silo storage for Junction: the persistent inbox kept in one Silo value, through the Silo store your application already has. Junction writes one complete snapshot at a time and waits for Silo's `flush()`, so an admission, a lease or an outcome counts as stored only once Silo says it is.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-silo @priemskiyyy/silo
```

## Create a Junction

Declare one value for the inbox, with no schema and no fallback: Junction validates what it reads back itself, and nothing stored reads as `undefined`.

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import type { InboxSnapshot } from "@priemskiyyy/junction";
import { silo } from "@priemskiyyy/junction-silo";
import { Silo, value } from "@priemskiyyy/silo";
import { mmkv } from "@priemskiyyy/silo-mmkv";
import { MMKV } from "react-native-mmkv";
import { z } from "zod";

export const store = new Silo({
  storages: {
    default: {
      adapters: [mmkv({ storage: new MMKV({ id: "junction" }) })],
      schema: { junctionInbox: value<InboxSnapshot>() },
    },
  },
});

const OpenDocument = z.object({ documentId: z.string() });

export const junction = new Junction({
  intents: {
    openDocument: intent(OpenDocument, { persist: { schema: OpenDocument } }),
  },
  storage: silo({ value: store.value("junctionInbox") }),
});
```

## Options

| Option  | Type            | Description                                                                                                              |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `value` | `SiloValueLike` | The handle `store.value(key)` returns for a value declared as `value<InboxSnapshot>()`. No other writer may use its key. |

## Choosing a backend

Junction needs one writer and a whole value replaced at once. What each adapter's own documentation says decides whether it fits:

| Adapter                                                          | For the inbox       | Why                                                                                                           |
| ---------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `mmkv()`                                                         | Yes                 | Synchronous and on the device; every write replaces the key.                                                  |
| `asyncStorage()`                                                 | Yes                 | On the device; Android caps the database at 6 MB by default, far above an inbox of at most 32 intents.        |
| `indexedDb()`                                                    | Yes, in one tab     | A write resolves when its transaction completes, so `flush()` means committed. Another tab is another writer. |
| `localStorage()`                                                 | Only with one tab   | Whole-key and synchronous, but it syncs across tabs, and two tabs would be two writers of one key.            |
| `sessionStorage()`                                               | For one tab         | Survives a reload and is gone when the tab closes, so intents outlive a reload, not the tab.                  |
| `jsonFile()`                                                     | Yes, in one process | Rewritten whole through a temporary file renamed into place, so a crash leaves the previous file intact.      |
| `secureStore()`, `keychain()`                                    | No                  | Built for secrets: SecureStore can reject large values, and iOS keychain items survive an uninstall.          |
| `memory()`                                                       | For tests           | Nothing survives the process.                                                                                 |
| `http()`, `redis()`, `cloudflareKv()`, `icloud()`, `unstorage()` | No                  | A shared or remote store has other writers, which the inbox cannot merge with.                                |

For any other adapter, run `testInboxStorage` from `@priemskiyyy/junction/testing` over it, and check its own documentation for what survives a crash.

## Behavior

- `read()` waits for the value's hydration and answers what it holds. A hydration Silo could not finish, such as a stored value it could not decode, is a failed read, which blocks Junction's storage instead of starting it empty.
- `replace()` sets the whole snapshot and resolves with Silo's `flush()`. A rejected `flush()` may still have committed; Junction treats it that way and retries only from `junction.storage.flush()` or its next change.
- Silo keeps only the newest pending write of a value. Every snapshot is complete, so a newer one landing in place of an older one loses nothing.
- The storage never removes, reloads or disposes the value: your Silo owns it.
- A write to the key from anywhere else is a conflict, never a merge: Junction reads the value once at `start()` and overwrites it with its next snapshot.

## Tests

- **Ran**: the storage against an in-process fake modelled on Silo 0.1.0's value record and write queue over an asynchronous adapter, both alone and through real Junctions and restarts in the storage conformance suite, and type contracts against Silo 0.1.0's `SiloValue` declaration, copied from its source.
- **Did not run**: a real Silo, which is not published yet, or any backend's own crash behavior.

## License

MIT
