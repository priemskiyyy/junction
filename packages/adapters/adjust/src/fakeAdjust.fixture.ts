import type { AdjustDeferredDeeplinkLike } from "src/types/AdjustDeferredDeeplinkLike";

// Modelled on react-native-adjust 5.8.0: the first deferred deep link callback set on any config wins for the life of the JavaScript runtime and has no removal of its own; native wires it only when it was set before initSdk, and hands it the deep link of the install's attribution, or on Android an empty map when there is none.
export const createFakeAdjust = () => {
  const calls: string[] = [];

  const state: {
    callback: ((deferred: AdjustDeferredDeeplinkLike) => void) | null;
    wired: boolean;
  } = { callback: null, wired: false };

  const sdk = {
    setDeferredDeeplinkCallback: (
      callback: (deferred: AdjustDeferredDeeplinkLike) => void,
    ) => {
      calls.push("setDeferredDeeplinkCallback");

      if (state.callback === null) {
        state.callback = callback;
      }
    },
    disableDeferredDeeplinkOpening: () => {
      calls.push("disableDeferredDeeplinkOpening");
    },
    setAttributionCallback: () => {
      calls.push("setAttributionCallback");
    },
  };

  const deliver = (deferred: AdjustDeferredDeeplinkLike) => {
    if (state.wired && state.callback !== null) {
      state.callback(deferred);
    }
  };

  return {
    sdk,
    calls,
    initSdk: () => {
      state.wired = state.callback !== null;
    },
    attribute: (deeplink: string) => deliver({ deeplink }),
    attributeWithoutLink: () => deliver({}),
    listeners: () => {
      if (state.callback === null) {
        return 0;
      }

      return 1;
    },
  };
};
