import type { StorageStatus } from "src/types/StorageStatus";
import { getCauselessError } from "src/utils/internal/diagnostics/getCauselessError";

export const getSnapshotStorageStatus = (
  status: StorageStatus,
): StorageStatus => {
  if (status.state !== "blocked") {
    return status;
  }

  return Object.freeze({
    state: "blocked",
    error: getCauselessError(status.error),
  });
};
