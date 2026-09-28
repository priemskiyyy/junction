import type { InboxEntry } from "src/types/InboxEntry";
import type { IntentPayload } from "src/types/IntentPayload";

/**
 * The inbox entries of a registry: a union discriminated by `name`, so
 * narrowing the name types the payload.
 *
 * @example
 * ```ts
 * const [entry] = junction.inbox.get();
 *
 * if (entry?.name === "openDocument") {
 *   console.log(entry.payload.documentId);
 * }
 * ```
 */
export type InboxEntryOf<TIntents> = {
  [TName in keyof TIntents & string]: InboxEntry<
    TName,
    IntentPayload<TIntents[TName]>
  >;
}[keyof TIntents & string];
