import type { AdjustConfigLike } from "src/types/AdjustConfigLike";

/**
 * The options of `adjust()`: the `AdjustConfig` your app passes to
 * `Adjust.initSdk()`.
 *
 * @example
 * ```ts
 * const options: AdjustSourceOptions<AdjustConfig> = { sdk: config };
 * ```
 */
export type AdjustSourceOptions<TSdk extends AdjustConfigLike> = {
  /** The `AdjustConfig` your app passes to `Adjust.initSdk()`, before it does. */
  sdk: TSdk;
};
