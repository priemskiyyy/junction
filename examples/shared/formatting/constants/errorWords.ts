import type { JunctionErrorCode } from "@priemskiyyy/junction";

/** Every Junction error code in the lab's words. */
export const ERROR_WORDS = {
  INVALID_CONFIGURATION: "the Junction is misconfigured",
  AMBIGUOUS_QUERY: "a query parameter repeats",
  STALE_EXECUTION: "the attempt was no longer current",
  ALREADY_SETTLED: "the attempt had already settled",
  HANDLER_FAILED: "the handler threw",
  INVALID_HANDLER_RESULT: "the handler answered something Junction cannot read",
  EFFECT_UNCERTAIN: "the effect may or may not have happened",
  ATTEMPTS_EXHAUSTED: "every attempt was used",
  OWNER_DISPOSED: "the screen that ran it went away",
  OWNER_UNMATCHED: "the screen that ran it stopped claiming it",
  OWNER_NOT_READY: "the screen that ran it stopped being ready",
  SCOPE_CHANGED: "the screen's scope changed",
  IDENTITY_CHANGED: "someone else signed in",
  TIMED_OUT: "it outlived its timeout",
  SOURCE_FAILED: "the source failed to attach",
  SOURCE_ERROR: "the provider reported an error",
  INITIAL_READ_FAILED: "the launch read failed",
  INITIAL_READ_TIMED_OUT: "the launch read timed out",
  PROCESS_RESTARTED: "Folio restarted while it ran",
  STORAGE_READ_FAILED: "the saved inbox could not be read",
  STORAGE_CORRUPT: "the saved inbox is corrupt",
  STORAGE_VERSION_UNSUPPORTED: "the saved inbox has an unknown version",
} satisfies Record<JunctionErrorCode, string>;
