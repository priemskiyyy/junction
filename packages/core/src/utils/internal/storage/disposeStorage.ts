import type { InboxStorage } from "src/types/InboxStorage";
import { callContained } from "src/utils/common/callContained";

export const disposeStorage = (
  storage: InboxStorage,
  handleFailure: () => void,
) => {
  const { dispose } = storage;

  if (typeof dispose !== "function") {
    return;
  }

  callContained(() => dispose.call(storage), handleFailure);
};
