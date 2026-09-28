import type {
  NotificationResponseLike,
  NotificationsLike,
} from "@priemskiyyy/junction-expo-notifications";

import { describeResponse } from "example-shared/device/describeResponse";
import type { DeviceLog } from "example-shared/device/types/DeviceLog";

/**
 * expo-notifications for one launch: native keeps the last press, emits a
 * press only to the listeners JavaScript has, and with `race` on hands the
 * press that launched the app to the first listener too, as a press native
 * handles while JavaScript starts listening does.
 */
export const createSimulatedNotifications = ({
  launchResponse,
  race,
  log,
}: {
  launchResponse: NotificationResponseLike | null;
  race: boolean;
  log: DeviceLog;
}) => {
  const listeners = new Set<(response: NotificationResponseLike) => void>();

  const state: {
    last: NotificationResponseLike | null;
    raced: NotificationResponseLike | null;
  } = { last: launchResponse, raced: race ? launchResponse : null };

  const sdk: NotificationsLike = {
    addNotificationResponseReceivedListener: (listener) => {
      log.call(
        "expo-notifications",
        "addNotificationResponseReceivedListener()",
      );
      listeners.add(listener);

      const { raced } = state;

      if (raced !== null) {
        state.raced = null;
        queueMicrotask(() => {
          if (!listeners.has(listener)) {
            return;
          }

          log.handOff({
            source: { name: "notifications" },
            via: "listener",
            label: "The platform delivered the same press again",
            detail: describeResponse(raced),
          });
          listener(raced);
        });
      }

      return {
        remove: () => {
          log.call("expo-notifications", "subscription.remove()");
          listeners.delete(listener);
        },
      };
    },
    getLastNotificationResponse: () => {
      const { last } = state;

      log.call(
        "expo-notifications",
        "getLastNotificationResponse()",
        last === null ? "null" : describeResponse(last),
      );

      if (last !== null) {
        log.handOff({
          source: { name: "notifications" },
          via: "launch-read",
          label: "The press native kept since launch",
          detail: describeResponse(last),
        });
      }

      return last;
    },
  };

  return {
    sdk,
    press: (response: NotificationResponseLike) => {
      state.last = response;

      for (const listener of [...listeners]) {
        log.handOff({
          source: { name: "notifications" },
          via: "listener",
          label: "A notification pressed while Folio runs",
          detail: describeResponse(response),
        });
        listener(response);
      }
    },
    end: () => {
      listeners.clear();
    },
  };
};
