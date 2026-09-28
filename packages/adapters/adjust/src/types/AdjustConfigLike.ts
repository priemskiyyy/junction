import type { AdjustDeferredDeeplinkLike } from "src/types/AdjustDeferredDeeplinkLike";

/**
 * The part of react-native-adjust's `AdjustConfig` the source calls: the
 * deferred deep link callback, which Adjust wires when `Adjust.initSdk()`
 * receives the config. The source never initializes Adjust or changes
 * anything else on the config.
 *
 * @example
 * ```ts
 * const sdk: AdjustConfigLike = new AdjustConfig(appToken, AdjustConfig.EnvironmentProduction);
 * ```
 */
export type AdjustConfigLike = {
  setDeferredDeeplinkCallback: (
    callback: (deferred: AdjustDeferredDeeplinkLike) => void,
  ) => void;
};
