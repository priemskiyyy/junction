import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";

/** An inbox entry that waits, with the reason and the screens the reason is about. */
export type PendingEntry = Extract<FolioInboxEntry, { state: "pending" }>;
