import type { IncomingSource, SourceSink } from "@priemskiyyy/junction";

import type { LinkingInput } from "src/types/LinkingInput";
import type { LinkingLike } from "src/types/LinkingLike";
import type { LinkingSourceOptions } from "src/types/LinkingSourceOptions";
import {
  LINKING_ADAPTER,
  LINKING_RESOURCE,
  URL_EVENT,
} from "src/utils/constants/linking";

/**
 * A source over React Native's `Linking`, or the `expo-linking` module: every
 * URL the operating system opens the app with, and the one that launched it.
 * It claims the `linking` feed, never opens a URL and never clears a launch
 * URL. It is for iOS and Android: on the web the page's URL belongs to the
 * router, so leave it out of a web build.
 *
 * @example
 * ```ts
 * import { Linking } from "react-native";
 *
 * const junction = new Junction({ intents, sources: { links: linking({ sdk: Linking }) }, routes });
 * ```
 */
export const linking = <TSdk extends LinkingLike>({
  sdk,
}: LinkingSourceOptions<TSdk>): IncomingSource<LinkingInput, TSdk> => ({
  name: LINKING_ADAPTER,
  native: sdk,
  resource: LINKING_RESOURCE,
  attach: (sink: SourceSink<LinkingInput>) => {
    const handleUrl = ({ url }: { url: string }) => {
      sink.push({ input: { url } });
    };

    const subscription = sdk.addEventListener(URL_EVENT, handleUrl);

    return {
      initial: async () => {
        const url = (await sdk.getInitialURL()) ?? null;

        if (url === null) {
          return null;
        }

        return { input: { url } };
      },
      dispose: () => subscription.remove(),
    };
  },
});
