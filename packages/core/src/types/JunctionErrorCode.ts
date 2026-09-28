/**
 * What went wrong, for an error Junction created: options that cannot work, a
 * query key read as single that repeats, an execution used after its lease
 * ended or committed twice, a handler that failed
 * or answered outside the contract, an attempt that was invalidated, or a
 * source that could not attach or read.
 *
 * @example
 * ```ts
 * const code: JunctionErrorCode = "OWNER_NOT_READY";
 * ```
 */
export type JunctionErrorCode =
  | "INVALID_CONFIGURATION"
  | "AMBIGUOUS_QUERY"
  | "STALE_EXECUTION"
  | "ALREADY_SETTLED"
  | "HANDLER_FAILED"
  | "INVALID_HANDLER_RESULT"
  | "EFFECT_UNCERTAIN"
  | "ATTEMPTS_EXHAUSTED"
  | "OWNER_DISPOSED"
  | "OWNER_UNMATCHED"
  | "OWNER_NOT_READY"
  | "SCOPE_CHANGED"
  | "IDENTITY_CHANGED"
  | "TIMED_OUT"
  | "SOURCE_FAILED"
  | "SOURCE_ERROR"
  | "INITIAL_READ_FAILED"
  | "INITIAL_READ_TIMED_OUT"
  | "PROCESS_RESTARTED"
  | "STORAGE_READ_FAILED"
  | "STORAGE_CORRUPT"
  | "STORAGE_VERSION_UNSUPPORTED";
