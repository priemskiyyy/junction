import type { IncomingSource, SourceSink } from "@priemskiyyy/junction";

import type { BranchInput } from "src/types/BranchInput";
import type { BranchLike } from "src/types/BranchLike";
import type { BranchOpenEventLike } from "src/types/BranchOpenEventLike";
import type { BranchSourceOptions } from "src/types/BranchSourceOptions";
import {
  BRANCH_ADAPTER,
  BRANCH_RESOURCE,
  CLICKED_BRANCH_LINK,
} from "src/utils/constants/branch";

/**
 * A source over react-native-branch: every session a Branch link opens,
 * the launch link and a deferred one included, which Branch delivers
 * through the same subscription. It pushes only what Branch reports as a
 * clicked Branch link, and reports Branch's errors on the source's status.
 *
 * @example
 * ```ts
 * import Branch from "react-native-branch";
 *
 * const junction = new Junction({ intents, sources: { referrals: branch({ sdk: Branch }) }, routes });
 * ```
 */
export const branch = <TSdk extends BranchLike>({
  sdk,
}: BranchSourceOptions<TSdk>): IncomingSource<BranchInput, TSdk> => ({
  name: BRANCH_ADAPTER,
  native: sdk,
  resource: BRANCH_RESOURCE,
  attach: (sink: SourceSink<BranchInput>) => {
    const handleOpenComplete = (event: BranchOpenEventLike) => {
      if (typeof event.error === "string") {
        sink.fail(event.error);

        return;
      }

      // A plain deep link or an organic open succeeds too, with the flag false: only a clicked Branch link is an entry point.
      if (event.params[CLICKED_BRANCH_LINK] !== true) {
        return;
      }

      sink.push({ input: { params: event.params, uri: event.uri ?? null } });
    };

    const unsubscribe = sdk.subscribe({ onOpenComplete: handleOpenComplete });

    return { dispose: () => unsubscribe() };
  },
});
