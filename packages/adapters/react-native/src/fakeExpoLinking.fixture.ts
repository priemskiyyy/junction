import { createFakeLinking } from "src/fakeLinking.fixture";

type Call = ["getLinkingURL"] | ["clearInitialURL"];

// Modelled on expo-linking 57.0.11 on native: the listener and the launch read are React Native's Linking, and Expo's native module keeps its own cached linking URL beside them.
export const createFakeExpoLinking = ({
  initial = null,
}: { initial?: string | null } = {}) => {
  const reactNative = createFakeLinking({ initial });
  const calls: Call[] = [];
  const cache: { url: string | null } = { url: initial };

  const sdk = {
    addEventListener: (
      type: "url",
      handler: (event: { url: string; nativeEvent?: MessageEvent }) => void,
    ) => reactNative.sdk.addEventListener(type, handler),
    getInitialURL: async () => (await reactNative.sdk.getInitialURL()) ?? null,
    getLinkingURL: () => {
      calls.push(["getLinkingURL"]);

      return cache.url;
    },
    clearInitialURL: () => {
      calls.push(["clearInitialURL"]);
      cache.url = null;
    },
  };

  return {
    sdk,
    calls,
    reactNative,
    open: (url: string) => {
      cache.url = url;
      reactNative.open(url);
    },
    launch: (url: string) => {
      cache.url = url;
      reactNative.launch(url);
    },
    listeners: reactNative.listeners,
  };
};
