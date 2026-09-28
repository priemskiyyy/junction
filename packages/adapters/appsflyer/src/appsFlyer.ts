import type { IncomingSource, SourceSink } from "@priemskiyyy/junction";

import type { AppsFlyerDeepLinkLike } from "src/types/AppsFlyerDeepLinkLike";
import type { AppsFlyerInput } from "src/types/AppsFlyerInput";
import type { AppsFlyerLike } from "src/types/AppsFlyerLike";
import type { AppsFlyerSourceOptions } from "src/types/AppsFlyerSourceOptions";
import {
  APPSFLYER_ADAPTER,
  APPSFLYER_RESOURCE,
  DEFERRED_KEY,
} from "src/utils/constants/appsFlyer";

/**
 * A source over react-native-appsflyer 7: every deep link AppsFlyer finds,
 * the launch link and a deferred one after an install included. It pushes
 * only `FOUND` results, with AppsFlyer's own claim about deferral, and
 * reports errors on the source's status. Start the Junction before
 * `AppsFlyer.init()`: AppsFlyer drops a deep link that arrives before its
 * listener exists.
 *
 * @example
 * ```ts
 * import { AppsFlyer } from "react-native-appsflyer";
 *
 * const junction = new Junction({ intents, sources: { campaigns: appsFlyer({ sdk: AppsFlyer }) }, routes });
 *
 * junction.start();
 * await AppsFlyer.init({ devKey, appId });
 * ```
 */
export const appsFlyer = <TSdk extends AppsFlyerLike>({
  sdk,
}: AppsFlyerSourceOptions<TSdk>): IncomingSource<AppsFlyerInput, TSdk> => ({
  name: APPSFLYER_ADAPTER,
  native: sdk,
  resource: APPSFLYER_RESOURCE,
  attach: (sink: SourceSink<AppsFlyerInput>) => {
    const handleDeepLinking = ({
      status,
      error,
      deepLink,
    }: AppsFlyerDeepLinkLike) => {
      if (status === "ERROR") {
        sink.fail(error);

        return;
      }

      if (status !== "FOUND") {
        return;
      }

      const params = deepLink ?? {};
      const deferred = params[DEFERRED_KEY];

      sink.push({
        input: { params },
        deferred: typeof deferred === "boolean" ? deferred : undefined,
      });
    };

    // The callback is set before this returns; the native registration settles later and may fail.
    sdk
      .registerDeepLinkListener({ onDeepLinking: handleDeepLinking })
      .catch((error: unknown) => sink.fail(error));

    return {
      // Android only: on iOS AppsFlyer rejects it in JavaScript, before anything reaches native code.
      dispose: () => sdk.unregisterDeepLinkListener().catch(() => {}),
    };
  },
});
