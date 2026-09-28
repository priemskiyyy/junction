/**
 * The parts of an expo-quick-actions `Action` the source reads: its id and
 * the params the app gave it with `setItems()`.
 *
 * @example
 * ```ts
 * const action: QuickActionLike = { id: "compose", params: { documentId: "42" } };
 * ```
 */
export type QuickActionLike = {
  id: string;
  /** Native answers `null` for an action the app gave no params. */
  params?: Record<string, unknown> | null;
};
