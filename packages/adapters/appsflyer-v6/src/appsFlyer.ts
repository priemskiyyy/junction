import type { IncomingSource, SourceSink } from "@priemskiyyy/junction";

import type { AppsFlyerDeepLinkLike } from "src/types/AppsFlyerDeepLinkLike";
import type { AppsFlyerInput } from "src/types/AppsFlyerInput";
import type { AppsFlyerLike } from "src/types/AppsFlyerLike";
import type { AppsFlyerSourceOptions } from "src/types/AppsFlyerSourceOptions";
import {
  APPSFLYER_ADAPTER,
  APPSFLYER_RESOURCE,
} from "src/utils/constants/appsFlyer";

/**
 * A source over react-native-appsflyer 6: every deep link its Unified Deep
 * Linking finds, the launch link and a deferred one after an install
 * included. It pushes only `FOUND` results, with AppsFlyer's own claim about
 * deferral, and reports errors on the source's status. Start the Junction
 * before `initSdk()`, which needs `onDeepLinkListener: true`.
 *
 * @example
 * ```ts
 * import appsFlyerSdk from "react-native-appsflyer";
 *
 * const junction = new Junction({ intents, sources: { campaigns: appsFlyer({ sdk: appsFlyerSdk }) }, routes });
 *
 * junction.start();
 * appsFlyerSdk.initSdk({ devKey, appId, onDeepLinkListener: true });
 * ```
 */
export const appsFlyer = <TSdk extends AppsFlyerLike>({
  sdk,
}: AppsFlyerSourceOptions<TSdk>): IncomingSource<AppsFlyerInput, TSdk> => ({
  name: APPSFLYER_ADAPTER,
  native: sdk,
  resource: APPSFLYER_RESOURCE,
  attach: (sink: SourceSink<AppsFlyerInput>) => {
    const handleDeepLink = (result: AppsFlyerDeepLinkLike) => {
      // A native payload that is not JSON reaches the callback as AppsFlyer's parse exception, with no status.
      if (!("deepLinkStatus" in result)) {
        sink.fail(result);

        return;
      }

      if (result.deepLinkStatus === "ERROR") {
        sink.fail(result.data);

        return;
      }

      if (result.deepLinkStatus !== "FOUND") {
        return;
      }

      sink.push({
        input: { params: result.data },
        deferred: result.isDeferred,
      });
    };

    const remove = sdk.onDeepLink(handleDeepLink);

    return { dispose: () => remove() };
  },
});
