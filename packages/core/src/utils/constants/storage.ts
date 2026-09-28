/** The format name every stored inbox carries, so another value under the same key is never mistaken for one. */
export const SNAPSHOT_FORMAT = "junction.inbox";

/** The snapshot version this Junction writes and reads; a newer one blocks the storage. */
export const SNAPSHOT_VERSION = 1;
