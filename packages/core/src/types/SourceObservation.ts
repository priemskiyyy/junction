/**
 * One thing a source observed: the normalized input, what the provider says
 * about deferral, and an occurrence identity only when the provider documents
 * one.
 *
 * @example
 * ```ts
 * sink.push({ input: { url }, deferred: false });
 * ```
 */
export type SourceObservation<TInput> = {
  input: TInput;
  /** What the provider claims; absent when it says nothing. */
  deferred?: boolean | undefined;
  /** The provider's identifier of this one occurrence, so a repeat of it is a duplicate; never a link, notification or campaign id. */
  interaction?: { key: string; scope: "runtime" | "installation" } | undefined;
};
