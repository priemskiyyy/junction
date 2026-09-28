import type { FolioSourceName } from "example-shared/junction/types/FolioSourceName";

/** One entry point an SDK handed to a Junction source: through the source's listener, or as the answer to its launch read. */
export type HandOff = {
  id: number;
  timestamp: number;
  source: { name: FolioSourceName };
  via: "listener" | "launch-read";
  label: string;
  detail: string;
};
