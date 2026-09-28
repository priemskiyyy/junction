/**
 * What the source pushes for every quick action: the action's id and its
 * params.
 *
 * @example
 * ```ts
 * const input: QuickActionInput = { action: { id: "compose", params: { documentId: "42" } } };
 * ```
 */
export type QuickActionInput = {
  /** `params` is `{}` for an action the app gave none. */
  action: { id: string; params: Record<string, unknown> };
};
