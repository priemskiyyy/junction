import type { NotificationResponseLike } from "src/types/NotificationResponseLike";

// Modelled on expo-notifications 57.0.21: native keeps the latest response and emits it to the listeners JavaScript has at that moment, dropping it when there are none, and getLastNotificationResponse answers the kept response synchronously until the app clears it. The event reaches JavaScript after a hop, so a press native handles just as JavaScript starts listening reaches both the kept response and the listener.
export const createFakeNotifications = () => {
  const listeners = new Set<(response: NotificationResponseLike) => void>();
  const calls: string[] = [];

  const state: {
    last: NotificationResponseLike | null;
    race: NotificationResponseLike | null;
  } = { last: null, race: null };

  const sdk = {
    addNotificationResponseReceivedListener: (
      listener: (response: NotificationResponseLike) => void,
    ) => {
      const registered = (response: NotificationResponseLike) =>
        listener(response);

      calls.push("addNotificationResponseReceivedListener");
      listeners.add(registered);

      const { race } = state;

      if (race !== null) {
        state.race = null;
        state.last = race;
        queueMicrotask(() => registered(race));
      }

      return {
        remove: () => {
          listeners.delete(registered);
        },
      };
    },
    getLastNotificationResponse: () => {
      calls.push("getLastNotificationResponse");

      return state.last;
    },
    clearLastNotificationResponse: () => {
      calls.push("clearLastNotificationResponse");
      state.last = null;
    },
    dismissAllNotificationsAsync: () => {
      calls.push("dismissAllNotificationsAsync");

      return Promise.resolve();
    },
    setBadgeCountAsync: (count: number) => {
      calls.push(`setBadgeCountAsync ${count}`);

      return Promise.resolve(true);
    },
  };

  return {
    sdk,
    calls,
    press: (response: NotificationResponseLike) => {
      state.last = response;

      for (const listener of [...listeners]) {
        listener(response);
      }
    },
    raceNextListener: (response: NotificationResponseLike) => {
      state.race = response;
    },
    listeners: () => listeners.size,
  };
};
