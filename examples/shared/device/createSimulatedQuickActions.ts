import type {
  QuickActionLike,
  QuickActionsLike,
} from "@priemskiyyy/junction-expo-quick-actions";

import type { DeviceLog } from "example-shared/device/types/DeviceLog";

/** expo-quick-actions for one launch: `initial` is the action the app launched from, read as a constant, and later actions go only to the listeners it has. */
export const createSimulatedQuickActions = ({
  launchAction,
  log,
}: {
  launchAction: QuickActionLike | null;
  log: DeviceLog;
}) => {
  const listeners = new Set<(action: QuickActionLike) => void>();

  const sdk: QuickActionsLike = {
    get initial() {
      log.call("expo-quick-actions", "initial", launchAction?.id ?? "null");

      if (launchAction !== null) {
        log.handOff({
          source: { name: "shortcuts" },
          via: "launch-read",
          label: "The shortcut Folio launched from",
          detail: launchAction.id,
        });
      }

      return launchAction;
    },
    addListener: (listener) => {
      log.call("expo-quick-actions", "addListener()");
      listeners.add(listener);

      return {
        remove: () => {
          log.call("expo-quick-actions", "subscription.remove()");
          listeners.delete(listener);
        },
      };
    },
  };

  return {
    sdk,
    perform: (action: QuickActionLike) => {
      for (const listener of [...listeners]) {
        log.handOff({
          source: { name: "shortcuts" },
          via: "listener",
          label: "A shortcut chosen while Folio runs",
          detail: action.id,
        });
        listener(action);
      }
    },
    end: () => {
      listeners.clear();
    },
  };
};
