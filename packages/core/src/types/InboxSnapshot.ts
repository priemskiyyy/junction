import type { JsonObject } from "src/types/JsonObject";

/**
 * What a Junction writes to its storage: one complete, plain JSON snapshot of
 * its persistent intents and their ledger. A storage keeps it as it is and
 * hands it back from `read`; Junction validates it on the way in.
 *
 * @example
 * ```ts
 * const replace = (snapshot: InboxSnapshot) => mmkv.set("junction", JSON.stringify(snapshot));
 * ```
 */
export type InboxSnapshot = {
  format: "junction.inbox";
  version: 1;
  /** Grows by one with every new snapshot; a retried write repeats its own, and `reset()` starts again at 1. */
  revision: number;
  /** Junction's clock when the snapshot was taken; a restored Junction's clock never runs behind it. */
  timestamp: number;
  intents: JsonObject[];
  ledger: JsonObject[];
};
