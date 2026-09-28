// Unlike isolate, a failure here is the caller's to report, never rethrown into the host.
export const callContained = (
  callback: () => unknown,
  handleFailure: (error: unknown) => void,
) => {
  try {
    const result = callback();

    if (result !== undefined) {
      new Promise((resolve) => resolve(result)).catch(handleFailure);
    }
  } catch (error) {
    handleFailure(error);
  }
};
