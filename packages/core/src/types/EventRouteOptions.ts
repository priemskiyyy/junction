import type { IntentInput } from "src/types/IntentInput";
import type { RouteCandidate } from "src/types/internal/RouteCandidate";

/**
 * An event route: which inputs it takes, the intent it produces, and the
 * payload it builds, which the intent's schema then validates.
 *
 * @example
 * ```ts
 * from.referrals.event({
 *   intent: "openDocument",
 *   match: ({ params }) => params.action === "open-document",
 *   payload: ({ params }) => ({ documentId: params.document_id }),
 * });
 * ```
 */
export type EventRouteOptions<
  TIntents,
  TInput,
  TName extends keyof TIntents & string,
> = {
  intent: TName;
  // A method, so that one route table holds the routes of every intent; every input matches without it.
  match?(input: TInput): boolean;
  // A method, for the same reason.
  payload(input: TInput): RouteCandidate<IntentInput<TIntents[TName]>>;
};
