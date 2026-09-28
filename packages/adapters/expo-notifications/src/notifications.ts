import type { IncomingSource, SourceSink } from "@priemskiyyy/junction";

import type { NotificationPressInput } from "src/types/NotificationPressInput";
import type { NotificationResponseLike } from "src/types/NotificationResponseLike";
import type { NotificationsLike } from "src/types/NotificationsLike";
import type { NotificationsSourceOptions } from "src/types/NotificationsSourceOptions";
import {
  NOTIFICATIONS_ADAPTER,
  NOTIFICATIONS_RESOURCE,
} from "src/utils/constants/notifications";
import { getPressObservation } from "src/utils/getPressObservation";

/**
 * A source over expo-notifications presses: every tap on a notification or
 * one of its actions, and, as the launch read, the press that launched the
 * app. It observes presses only, never notifications that arrive, and
 * never clears the response Expo keeps.
 *
 * @example
 * ```ts
 * import * as Notifications from "expo-notifications";
 *
 * const junction = new Junction({ intents, sources: { presses: notifications({ sdk: Notifications }) }, routes });
 * ```
 */
export const notifications = <TSdk extends NotificationsLike>({
  sdk,
  interaction,
}: NotificationsSourceOptions<TSdk>): IncomingSource<
  NotificationPressInput,
  TSdk
> => ({
  name: NOTIFICATIONS_ADAPTER,
  native: sdk,
  resource: NOTIFICATIONS_RESOURCE,
  attach: (sink: SourceSink<NotificationPressInput>) => {
    const perAction = interaction === "per-notification-action";

    const handleResponse = (response: NotificationResponseLike) => {
      sink.push(getPressObservation(response, perAction));
    };

    const subscription =
      sdk.addNotificationResponseReceivedListener(handleResponse);

    return {
      initial: () => {
        const response = sdk.getLastNotificationResponse();

        if (response === null) {
          return null;
        }

        return getPressObservation(response, perAction);
      },
      dispose: () => subscription.remove(),
    };
  },
});
