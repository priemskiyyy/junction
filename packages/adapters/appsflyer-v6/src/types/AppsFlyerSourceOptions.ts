import type { AppsFlyerLike } from "src/types/AppsFlyerLike";

/**
 * The options of `appsFlyer()`: the react-native-appsflyer 6 module the
 * application already has.
 *
 * @example
 * ```ts
 * const options: AppsFlyerSourceOptions<typeof appsFlyer> = { sdk: appsFlyer };
 * ```
 */
export type AppsFlyerSourceOptions<TSdk extends AppsFlyerLike> = {
  /** react-native-appsflyer 6's default export. */
  sdk: TSdk;
};
