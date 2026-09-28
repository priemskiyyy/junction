import type { JunctionError } from "src/utils/JunctionError";

/**
 * Where the Junction's storage stands: `ready` once the stored inbox was
 * restored, with whether the last write committed, and `blocked` when it could
 * not be read or trusted, which refuses persistent intents until `reset()`.
 *
 * @example
 * ```ts
 * const status: StorageStatus = junction.storage.status.get();
 * ```
 */
export type StorageStatus =
  | { state: "none" }
  | { state: "idle" }
  | { state: "hydrating" }
  | {
      state: "ready";
      /** `pending` while a write is on its way, `unconfirmed` after one failed or outlived `timeout.storage`, which may still have committed. */
      durability: "committed" | "pending" | "unconfirmed";
    }
  | {
      state: "blocked";
      error: JunctionError<
        | "STORAGE_READ_FAILED"
        | "STORAGE_CORRUPT"
        | "STORAGE_VERSION_UNSUPPORTED"
      >;
    }
  | { state: "disposed" };
