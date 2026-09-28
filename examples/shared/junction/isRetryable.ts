import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";

/** Whether `junction.retry()` can take an entry: a failed or interrupted intent that has attempts left. */
export const isRetryable = (entry: FolioInboxEntry) => {
  if (entry.state === "interrupted") {
    return true;
  }

  return entry.state === "failed" && entry.error.code !== "ATTEMPTS_EXHAUSTED";
};
