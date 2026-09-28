import type { InboxEntry } from "src/types/InboxEntry";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { SourceStatus } from "src/types/SourceStatus";
import type { StorageStatus } from "src/types/StorageStatus";

/** The inbox before anything was accepted, interned so observers compare it by identity. */
export const EMPTY_INBOX: InboxEntry<string, unknown>[] = [];

Object.freeze(EMPTY_INBOX);

/** An identity the application has not resolved yet, interned so observers compare it by identity. */
export const RESTORING_IDENTITY: JunctionIdentity = Object.freeze({
  status: "restoring",
});

/** The identity of a Junction with no identity store, which only runs public intents. */
export const ANONYMOUS_IDENTITY: JunctionIdentity = Object.freeze({
  status: "anonymous",
});

/** A source before `start()`, interned so observers compare statuses by identity. */
export const IDLE_SOURCE_STATUS: SourceStatus = Object.freeze({
  state: "idle",
});

/** A source after `dispose()`, interned so observers compare statuses by identity. */
export const DISPOSED_SOURCE_STATUS: SourceStatus = Object.freeze({
  state: "disposed",
});

/** The storage of a Junction configured without one: every intent is memory only. */
export const NO_STORAGE_STATUS: StorageStatus = Object.freeze({
  state: "none",
});

/** A configured storage before `start()`, interned so observers compare statuses by identity. */
export const IDLE_STORAGE_STATUS: StorageStatus = Object.freeze({
  state: "idle",
});

/** A storage whose stored inbox is being read and restored. */
export const HYDRATING_STORAGE_STATUS: StorageStatus = Object.freeze({
  state: "hydrating",
});

/** The storage of a disposed Junction, which writes nothing more. */
export const DISPOSED_STORAGE_STATUS: StorageStatus = Object.freeze({
  state: "disposed",
});
