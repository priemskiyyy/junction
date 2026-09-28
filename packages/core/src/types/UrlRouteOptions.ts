import type { IntentInput } from "src/types/IntentInput";
import type { RouteCandidate } from "src/types/internal/RouteCandidate";
import type { UrlMatch } from "src/types/UrlMatch";

/**
 * A URL route: the pattern it matches, the intent it produces, and the
 * payload it builds from the match, which the intent's schema then validates.
 *
 * @example
 * ```ts
 * from.links.url({
 *   url: "https://app.example.com/documents/:documentId",
 *   intent: "openDocument",
 *   payload: ({ params }) => ({ documentId: params.documentId }),
 * });
 * ```
 */
export type UrlRouteOptions<
  TIntents,
  TInput,
  TName extends keyof TIntents & string,
  TPattern extends string,
> = {
  /** Scheme, host, optional port and path in one pattern; each `:name` segment captures one segment. */
  url: TPattern;
  intent: TName;
  // A method, so that one route table holds the routes of every intent.
  payload(
    match: UrlMatch<TPattern, TInput>,
  ): RouteCandidate<IntentInput<TIntents[TName]>>;
};
