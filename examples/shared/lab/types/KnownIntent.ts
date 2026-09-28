import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";

/** An intent as the lab first saw it in the inbox, kept after it ends so the page can still say what it was. */
export type KnownIntent = { id: string; label: string; entry: FolioInboxEntry };
