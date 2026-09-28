import type { ObservableValue } from "@priemskiyyy/junction";

/** A clock reading that updates once per `interval` while anything subscribes, so countdowns tick without an effect of their own. */
export const createTicker = ({
  now,
  interval,
}: {
  now: () => number;
  interval: number;
}): ObservableValue<number> => {
  const listeners = new Set<() => void>();

  const state: {
    value: number;
    timer: ReturnType<typeof setInterval> | null;
  } = { value: now(), timer: null };

  return {
    get: () => state.value,
    subscribe: (listener) => {
      listeners.add(listener);

      if (state.timer === null) {
        state.value = now();
        state.timer = setInterval(() => {
          state.value = now();

          for (const current of [...listeners]) {
            current();
          }
        }, interval);
      }

      return () => {
        listeners.delete(listener);

        if (listeners.size > 0 || state.timer === null) {
          return;
        }

        clearInterval(state.timer);
        state.timer = null;
      };
    },
  };
};
