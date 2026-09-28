/** One write Junction made to the lab's storage, and whether it committed. */
export type StorageWrite = {
  id: number;
  timestamp: number;
  revision: number;
  intents: number;
  status: "committed" | "failed";
};
