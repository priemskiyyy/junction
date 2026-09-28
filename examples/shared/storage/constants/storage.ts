/** How long the device's storage takes to read or write. */
export const STORAGE_LATENCY = 80;

/** How many recent writes the lab shows. */
export const WRITES_LENGTH = 5;

/** What an unreadable saved inbox looks like: the right format with fields no Junction wrote. */
export const CORRUPT_SNAPSHOT = {
  format: "junction.inbox",
  version: 1,
  revision: -1,
  timestamp: "yesterday",
  intents: "unreadable",
  ledger: [],
};
