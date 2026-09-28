import type { AppsFlyerDeepLinkLike } from "src/types/AppsFlyerDeepLinkLike";

/**
 * The parts of react-native-appsflyer 7's `AppsFlyer` the source calls.
 * Pass the module's export; the source never initializes, starts, stops,
 * identifies or asks for consent with it.
 *
 * @example
 * ```ts
 * const sdk: AppsFlyerLike = AppsFlyer;
 * ```
 */
export type AppsFlyerLike = {
  registerDeepLinkListener: (callbacks: {
    onDeepLinking: (data: AppsFlyerDeepLinkLike) => void;
  }) => Promise<void>;
  unregisterDeepLinkListener: () => Promise<void>;
};
