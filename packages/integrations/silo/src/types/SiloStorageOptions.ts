import type { SiloValueLike } from "src/types/SiloValueLike";

/**
 * The options of `silo()`: the one Silo value the inbox lives in.
 *
 * @example
 * ```ts
 * const options: SiloStorageOptions = { value: store.value("junctionInbox") };
 * ```
 */
export type SiloStorageOptions = {
  /** A value declared as `value<InboxSnapshot>()`, under a key no other writer uses. */
  value: SiloValueLike;
};
