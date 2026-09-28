/**
 * What react-native-adjust hands the deferred deep link callback: the deep
 * link the install's attribution carried.
 *
 * @example
 * ```ts
 * const deferred: AdjustDeferredDeeplinkLike = { deeplink: "myapp://documents/42" };
 * ```
 */
export type AdjustDeferredDeeplinkLike = {
  /** Missing on Android when the attribution carries no link, whatever react-native-adjust's declarations say. */
  deeplink?: string;
};
