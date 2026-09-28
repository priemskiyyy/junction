import type { IncomingSource, SourceSink } from "@priemskiyyy/junction";

import type { QuickActionInput } from "src/types/QuickActionInput";
import type { QuickActionLike } from "src/types/QuickActionLike";
import type { QuickActionsLike } from "src/types/QuickActionsLike";
import type { QuickActionsSourceOptions } from "src/types/QuickActionsSourceOptions";
import {
  QUICK_ACTIONS_ADAPTER,
  QUICK_ACTIONS_RESOURCE,
} from "src/utils/constants/quickActions";
import { getActionObservation } from "src/utils/getActionObservation";

/**
 * A source over expo-quick-actions: the home screen action that launched
 * the app, as the launch read, and every action chosen while it runs. It
 * never sets, clears or queries the app's items.
 *
 * @example
 * ```ts
 * import * as QuickActions from "expo-quick-actions";
 *
 * const junction = new Junction({ intents, sources: { shortcuts: quickActions({ sdk: QuickActions }) }, routes });
 * ```
 */
export const quickActions = <TSdk extends QuickActionsLike>({
  sdk,
}: QuickActionsSourceOptions<TSdk>): IncomingSource<
  QuickActionInput,
  TSdk
> => ({
  name: QUICK_ACTIONS_ADAPTER,
  native: sdk,
  resource: QUICK_ACTIONS_RESOURCE,
  attach: (sink: SourceSink<QuickActionInput>) => {
    const handleAction = (action: QuickActionLike) => {
      sink.push(getActionObservation(action));
    };

    const subscription = sdk.addListener(handleAction);

    return {
      initial: () => {
        const action = sdk.initial ?? null;

        if (action === null) {
          return null;
        }

        return getActionObservation(action);
      },
      dispose: () => subscription.remove(),
    };
  },
});
