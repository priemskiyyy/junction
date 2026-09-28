import type { AppsFlyerDeepLinkLike } from "src/types/AppsFlyerDeepLinkLike";

// Modelled on react-native-appsflyer 7.0.2 over @appsflyer-sdk/js-core-plugin 7.0.15: registerDeepLinkListener sets the one deep link callback synchronously, replacing any earlier one, then registers natively, which may reject; results reach the callback normalized onto FOUND, NOT_FOUND or ERROR; unregisterDeepLinkListener exists on Android only, rejects on iOS without reaching native code, and never clears the callback.
export const createFakeAppsFlyer = ({
  platform = "android",
}: { platform?: "ios" | "android" } = {}) => {
  const calls: string[] = [];

  const state: {
    callback: ((data: AppsFlyerDeepLinkLike) => void) | null;
    registered: boolean;
    refusal: unknown;
  } = { callback: null, registered: false, refusal: null };

  const record = (name: string) => () => {
    calls.push(name);

    return Promise.resolve();
  };

  const sdk = {
    registerDeepLinkListener: (callbacks: {
      onDeepLinking: (data: AppsFlyerDeepLinkLike) => void;
    }) => {
      calls.push("registerDeepLinkListener");
      state.callback = callbacks.onDeepLinking;

      if (state.refusal !== null) {
        return Promise.reject(state.refusal);
      }

      state.registered = true;

      return Promise.resolve();
    },
    unregisterDeepLinkListener: () => {
      calls.push("unregisterDeepLinkListener");

      if (platform === "ios") {
        return Promise.reject(
          new Error('No "unregisterDeepLinkListener" entry for ios.'),
        );
      }

      state.registered = false;

      return Promise.resolve();
    },
    init: record("init"),
    start: record("start"),
    stop: record("stop"),
    setConsentData: record("setConsentData"),
    setCustomerUserId: record("setCustomerUserId"),
  };

  return {
    sdk,
    calls,
    deliver: (data: AppsFlyerDeepLinkLike) => {
      if (state.registered) {
        state.callback?.(data);
      }
    },
    refuseRegistration: (error: unknown) => {
      state.refusal = error;
    },
    listeners: () => {
      if (state.registered) {
        return 1;
      }

      return 0;
    },
  };
};
