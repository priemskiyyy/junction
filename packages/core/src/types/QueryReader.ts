/**
 * The query of a matched URL, read explicitly: nothing reaches a payload
 * unless its route asks for it, and a key asked for as single may not repeat.
 *
 * @example
 * ```ts
 * payload: ({ query }) => ({ accountId: query.single("account"), tags: query.all("tag") }),
 * ```
 */
export type QueryReader = {
  /** The one value of `key`: `""` for `?key` or `?key=`, `undefined` when absent. Throws `AMBIGUOUS_QUERY` when the key repeats. */
  single: (key: string) => string | undefined;
  /** Every value of `key`, in order. */
  all: (key: string) => string[];
  has: (key: string) => boolean;
};
