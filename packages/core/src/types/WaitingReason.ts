/**
 * Why a pending intent has not run yet, each a lowercase phrase.
 *
 * @example
 * ```ts
 * const reason: WaitingReason = "account-mismatch";
 * ```
 */
export type WaitingReason =
  | "no-consumer"
  | "ambiguous-consumer"
  | "consumer-not-ready"
  | "readiness-error"
  | "selection-error"
  | "identity-restoring"
  | "authentication"
  | "account-mismatch"
  | "capacity"
  | "storage";
