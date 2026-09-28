import type { SourceStatus } from "src/types/SourceStatus";
import { getCauselessError } from "src/utils/internal/diagnostics/getCauselessError";

export const getSnapshotSourceStatus = (status: SourceStatus): SourceStatus => {
  if (status.state === "failed") {
    return Object.freeze({
      state: "failed",
      error: getCauselessError(status.error),
    });
  }

  if (status.state === "attached" && status.error !== null) {
    return Object.freeze({ ...status, error: getCauselessError(status.error) });
  }

  return status;
};
