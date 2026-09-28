/**
 * How a dispatch identifies its occurrence: the same key with the same intent
 * and payload is a duplicate, with another one a conflict.
 *
 * @example
 * ```ts
 * await junction.dispatch("openDocument", payload, { interaction: { key: `share-sheet:${shareId}` } });
 * ```
 */
export type DispatchOptions = {
  interaction?: { key: string } | undefined;
};
