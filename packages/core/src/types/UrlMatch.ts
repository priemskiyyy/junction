import type { QueryReader } from "src/types/QueryReader";
import type { UrlParams } from "src/types/UrlParams";

/**
 * What a URL route's `payload` receives: the parameters its pattern captured,
 * the query to read explicitly, and the source's whole input.
 *
 * @example
 * ```ts
 * payload: ({ params, query }) => ({ documentId: params.documentId, accountId: query.single("account") }),
 * ```
 */
export type UrlMatch<TPattern extends string, TInput> = {
  params: UrlParams<TPattern>;
  query: QueryReader;
  input: TInput;
};
