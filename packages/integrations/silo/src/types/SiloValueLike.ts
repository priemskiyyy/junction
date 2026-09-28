import type { InboxSnapshot } from "@priemskiyyy/junction";

/**
 * The parts of one Silo value handle the storage calls: the handle
 * `silo.value(key)` returns for a value declared as
 * `value<InboxSnapshot>()`. The storage never removes, reloads or disposes it.
 *
 * @example
 * ```ts
 * const inbox: SiloValueLike = store.value("junctionInbox");
 * ```
 */
export type SiloValueLike = {
  /** The stored snapshot once hydrated, or the value's fallback, `undefined` or `null`, when nothing is stored. */
  get: () => unknown;
  set: (value: InboxSnapshot) => void;
  status: {
    get: () =>
      | { state: "hydrating" }
      | { state: "ready" }
      | { state: "error"; error: unknown };
  };
  /** Settles once hydration ended, successfully or not; the status tells which. */
  hydrated: () => Promise<void>;
  /** Settles once the newest accepted write is durable, and rejects while it was refused. */
  flush: () => Promise<void>;
};
