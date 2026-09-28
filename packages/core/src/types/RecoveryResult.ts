/**
 * What `retry` or `cancel` did: applied, only requested because the intent's
 * handler is still running, or refused for a reason.
 *
 * @example
 * ```ts
 * const result = await junction.cancel(entry.id);
 *
 * if (result.status === "refused") {
 *   console.warn(result.reason);
 * }
 * ```
 */
export type RecoveryResult =
  | { status: "applied" }
  | { status: "requested" }
  | {
      status: "refused";
      reason:
        | "unknown"
        | "not-started"
        | "disposed"
        | "not-recoverable"
        | "running"
        | "expired"
        | "attempts-exhausted";
    };
