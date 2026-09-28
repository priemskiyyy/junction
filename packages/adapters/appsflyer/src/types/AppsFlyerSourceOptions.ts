import type { AppsFlyerLike } from "src/types/AppsFlyerLike";

/**
 * The options of `appsFlyer()`: the react-native-appsflyer 7 module the
 * application already has.
 *
 * @example
 * ```ts
 * const options: AppsFlyerSourceOptions<typeof AppsFlyer> = { sdk: AppsFlyer };
 * ```
 */
export type AppsFlyerSourceOptions<TSdk extends AppsFlyerLike> = {
  /** react-native-appsflyer's `AppsFlyer` export. */
  sdk: TSdk;
};
