import type { QuickActionLike } from "src/types/QuickActionLike";

/**
 * The parts of the expo-quick-actions module the source reads. Pass the
 * module, `import * as QuickActions from "expo-quick-actions"`; the source
 * never sets or queries the app's items with it.
 *
 * @example
 * ```ts
 * const sdk: QuickActionsLike = QuickActions;
 * ```
 */
export type QuickActionsLike = {
  /** The action that launched the app, fixed when the module loads; `null` or `undefined` when none did. */
  initial: QuickActionLike | null | undefined;
  addListener: (listener: (action: QuickActionLike) => void) => {
    remove: () => void;
  };
};
