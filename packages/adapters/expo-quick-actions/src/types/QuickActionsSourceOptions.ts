import type { QuickActionsLike } from "src/types/QuickActionsLike";

/**
 * The options of `quickActions()`: the expo-quick-actions module.
 *
 * @example
 * ```ts
 * const options: QuickActionsSourceOptions<typeof QuickActions> = { sdk: QuickActions };
 * ```
 */
export type QuickActionsSourceOptions<TSdk extends QuickActionsLike> = {
  /** The expo-quick-actions module: `import * as QuickActions from "expo-quick-actions"`. */
  sdk: TSdk;
};
