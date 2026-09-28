import { callContained } from "src/utils/common/callContained";

// A listener's failure is rethrown in a microtask, so it reaches the app's error reporting without stopping the other listeners.
export const isolate = (callback: () => unknown) =>
  callContained(callback, (error) => {
    queueMicrotask(() => {
      throw error;
    });
  });
