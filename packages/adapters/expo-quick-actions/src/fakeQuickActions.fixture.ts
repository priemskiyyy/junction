import type { QuickActionLike } from "src/types/QuickActionLike";

// Modelled on expo-quick-actions 6.0.2: `initial` is a constant the module reads once when it loads, the action native captured at launch and never clears; native emits a later action only to the listeners JavaScript has at that moment, and on iOS the launch action can reach a listener too, since the app delegate lets iOS perform it after launch.
export const createFakeQuickActions = () => {
  const listeners = new Set<(action: QuickActionLike) => void>();
  const calls: string[] = [];

  const state: { initial: QuickActionLike | null | undefined } = {
    initial: undefined,
  };

  const sdk = {
    get initial() {
      calls.push("initial");

      return state.initial;
    },
    addListener: (listener: (action: QuickActionLike) => void) => {
      const registered = (action: QuickActionLike) => listener(action);

      calls.push("addListener");
      listeners.add(registered);

      return {
        remove: () => {
          calls.push("remove");
          listeners.delete(registered);
        },
      };
    },
    setItems: () => {
      calls.push("setItems");

      return Promise.resolve();
    },
    isSupported: () => {
      calls.push("isSupported");

      return Promise.resolve(true);
    },
  };

  return {
    sdk,
    calls,
    launch: (action: QuickActionLike | null | undefined) => {
      state.initial = action;
    },
    perform: (action: QuickActionLike) => {
      for (const listener of [...listeners]) {
        listener(action);
      }
    },
    listeners: () => listeners.size,
  };
};
