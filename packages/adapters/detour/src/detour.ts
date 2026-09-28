import type { IncomingSource, SourceSink } from "@priemskiyyy/junction";

import type { DetourInput } from "src/types/DetourInput";
import type { DetourLike } from "src/types/DetourLike";
import type { DetourSourceOptions } from "src/types/DetourSourceOptions";
import { DETOUR_ADAPTER, DETOUR_RESOURCE } from "src/utils/constants/detour";
import { getDetourObservation } from "src/utils/getDetourObservation";

/**
 * A source over Software Mansion's Detour: every link the mounted
 * `DetourProvider` resolves, the deferred link after an install included,
 * with Detour's own claim about deferral. Its launch read waits for the
 * provider's launch processing.
 *
 * @example
 * ```ts
 * import { Detour } from "@swmansion/react-native-detour";
 *
 * const junction = new Junction({ intents, sources: { links: detour({ sdk: Detour }) }, routes });
 * ```
 */
export const detour = <TSdk extends DetourLike>({
  sdk,
}: DetourSourceOptions<TSdk>): IncomingSource<DetourInput, TSdk> => ({
  name: DETOUR_ADAPTER,
  native: sdk,
  resource: DETOUR_RESOURCE,
  attach: (sink: SourceSink<DetourInput>) => {
    const handleUrl = ({ url }: { url: string }) => {
      sink.push(getDetourObservation(url));
    };

    const subscription = sdk.addEventListener("url", handleUrl);

    return {
      initial: async () => {
        const url = await sdk.getInitialURL();

        if (url === undefined) {
          return null;
        }

        return getDetourObservation(url);
      },
      dispose: () => subscription.remove(),
    };
  },
});
