import type { AppsFlyerDeepLinkLike } from "src/types/AppsFlyerDeepLinkLike";

/**
 * The part of react-native-appsflyer 6's default export the source calls.
 * Pass the module's default export; the source never initializes, stops,
 * identifies or asks for consent with it.
 *
 * @example
 * ```ts
 * const sdk: AppsFlyerLike = appsFlyer;
 * ```
 */
export type AppsFlyerLike = {
  onDeepLink: (callback: (data: AppsFlyerDeepLinkLike) => void) => () => void;
};
