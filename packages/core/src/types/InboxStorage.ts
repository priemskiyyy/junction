import type { InboxSnapshot } from "src/types/InboxSnapshot";

/**
 * Where a Junction keeps its persistent intents: one complete snapshot,
 * replaced atomically by one writer, so a crash leaves the old snapshot or the
 * new one, never half of each. Only one Junction may write to it.
 *
 * @example
 * ```ts
 * const storage: InboxStorage = {
 *   read: () => {
 *     const text = mmkv.getString("junction");
 *
 *     if (text === undefined) {
 *       return undefined;
 *     }
 *
 *     return JSON.parse(text);
 *   },
 *   replace: (snapshot) => mmkv.set("junction", JSON.stringify(snapshot)),
 * };
 * ```
 */
export type InboxStorage = {
  /** The stored snapshot, or `undefined` or `null` for none, as a value or a promise; a throw is a failed read, never an empty inbox. */
  read: () => unknown;
  /** Replaces the whole snapshot atomically; a rejection may still have committed. */
  replace: (
    snapshot: InboxSnapshot,
    operation: { id: string },
  ) => void | Promise<void>;
  /** Called once, when the Junction is disposed and no read or write is in flight. */
  dispose?: (() => void | Promise<void>) | undefined;
};
