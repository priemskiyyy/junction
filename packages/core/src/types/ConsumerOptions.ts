/**
 * Which intents a consumer owns and whether it can run them now. `match`
 * decides ownership, `ready` readiness; an unready owner keeps its intents.
 *
 * @example
 * ```ts
 * const options: ConsumerOptions<{ workspaceId: string }> = {
 *   match: (payload) => payload.workspaceId === workspaceId,
 *   ready: navigationReady,
 *   scope: workspaceId,
 * };
 * ```
 */
export type ConsumerOptions<TPayload> = {
  /** A label for diagnostics; never identity or precedence. */
  name?: string | undefined;
  /** Whether this consumer owns the intent, from the payload and your own state, never Junction's inbox: always true by default. */
  match?: ((payload: TPayload) => boolean) | undefined;
  /** Whether the owner can run now, from your own state, never Junction's inbox: true by default. */
  ready?: boolean | (() => boolean) | undefined;
  /** A fallback owns an intent only when no primary consumer matches it. */
  fallback?: boolean | undefined;
  /** The execution scope: changing it invalidates the running attempt. */
  scope?: string | number | undefined;
  /** How long one attempt may run, in milliseconds; the Junction's `timeout.execution` by default. */
  timeout?: number | undefined;
};
