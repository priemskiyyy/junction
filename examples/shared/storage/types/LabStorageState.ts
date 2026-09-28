import type { InboxSnapshot } from "@priemskiyyy/junction";

import type { StorageWrite } from "example-shared/storage/types/StorageWrite";

/** The device's storage as the lab shows it: the saved inbox, the recent writes, and the two ways the lab can break it. */
export type LabStorageState = {
  snapshot: InboxSnapshot | null;
  writes: StorageWrite[];
  failing: boolean;
  corrupt: boolean;
  /** Grows whenever the lab scrambles or clears the storage. */
  epoch: number;
};
