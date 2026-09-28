/** Resolves after `duration` milliseconds, or rejects as soon as the signal aborts. */
export const wait = (duration: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new Error("The work was cancelled."));

      return;
    }

    const handleAbort = () => {
      clearTimeout(timer);
      reject(new Error("The work was cancelled."));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, duration);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
