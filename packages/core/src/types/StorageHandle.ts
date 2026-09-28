import type { ObservableValue } from "src/types/ObservableValue";
import type { StorageStatus } from "src/types/StorageStatus";

/**
 * The Junction's storage: its status, `flush()`, which resolves once every
 * change made before it is written and retries a failed write (at once, with
 * `unconfirmed`, while a write outlives `timeout.storage`), and `reset()`,
 * which replaces a blocked storage's inbox with an empty one.
 *
 * @example
 * ```ts
 * AppState.addEventListener("change", (state) => {
 *   if (state === "background") {
 *     junction.storage.flush();
 *   }
 * });
 * ```
 */
export type StorageHandle = {
  status: ObservableValue<StorageStatus>;
  flush: () => Promise<StorageStatus>;
  reset: () => Promise<StorageStatus>;
};
