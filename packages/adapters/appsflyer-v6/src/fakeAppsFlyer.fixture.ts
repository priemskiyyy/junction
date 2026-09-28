import type { AppsFlyerDeepLinkLike } from "src/types/AppsFlyerDeepLinkLike";

// Modelled on react-native-appsflyer 6.18.0: onDeepLink adds one EventEmitter listener per call and returns its remover; every native event is a JSON string parsed into a fresh object before the callback runs, and one that is not JSON reaches the callback as an AFParseJSONException, a plain object with message, data and name.
export const createFakeAppsFlyer = () => {
  const callbacks = new Set<(data: AppsFlyerDeepLinkLike) => void>();
  const calls: string[] = [];

  const record = (name: string) => () => {
    calls.push(name);

    return Promise.resolve("OK");
  };

  const sdk = {
    onDeepLink: (callback: (data: AppsFlyerDeepLinkLike) => void) => {
      const listener = (data: AppsFlyerDeepLinkLike) => callback(data);

      calls.push("onDeepLink");
      callbacks.add(listener);

      return () => {
        callbacks.delete(listener);
      };
    },
    initSdk: record("initSdk"),
    stop: record("stop"),
    setConsentData: record("setConsentData"),
    setCustomerUserId: record("setCustomerUserId"),
  };

  const emit = (data: AppsFlyerDeepLinkLike) => {
    for (const callback of [...callbacks]) {
      callback(data);
    }
  };

  return {
    sdk,
    calls,
    deliver: (data: AppsFlyerDeepLinkLike) => emit(structuredClone(data)),
    deliverUnparsable: (payload: string) =>
      emit({
        name: "AFParseJSONException",
        message: "Invalid data structure",
        data: payload,
      }),
    listeners: () => callbacks.size,
  };
};
