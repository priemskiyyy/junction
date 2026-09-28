import type { IncomingSource, SourceSink } from "@priemskiyyy/junction";

import type { AdjustConfigLike } from "src/types/AdjustConfigLike";
import type { AdjustDeferredDeeplinkLike } from "src/types/AdjustDeferredDeeplinkLike";
import type { AdjustInput } from "src/types/AdjustInput";
import type { AdjustSourceOptions } from "src/types/AdjustSourceOptions";
import { ADJUST_ADAPTER, ADJUST_RESOURCE } from "src/utils/constants/adjust";

/**
 * A source over Adjust's deferred deep link: the link a new install came
 * through, which Adjust reports once its attribution arrives. It sets the
 * callback on your `AdjustConfig`, so start the Junction before
 * `Adjust.initSdk()`.
 *
 * @example
 * ```ts
 * const config = new AdjustConfig(appToken, AdjustConfig.EnvironmentProduction);
 * const junction = new Junction({ intents, sources: { installs: adjust({ sdk: config }) }, routes });
 * ```
 */
export const adjust = <TSdk extends AdjustConfigLike>({
  sdk,
}: AdjustSourceOptions<TSdk>): IncomingSource<AdjustInput, TSdk> => ({
  name: ADJUST_ADAPTER,
  native: sdk,
  resource: ADJUST_RESOURCE,
  attach: (sink: SourceSink<AdjustInput>) => {
    const handleDeferredDeeplink = ({
      deeplink,
    }: AdjustDeferredDeeplinkLike) => {
      if (deeplink === undefined) {
        return;
      }

      sink.push({ input: { url: deeplink }, deferred: true });
    };

    sdk.setDeferredDeeplinkCallback(handleDeferredDeeplink);

    return {};
  },
});
