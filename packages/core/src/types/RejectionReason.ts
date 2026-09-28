/**
 * Why an observation or a dispatch was refused, each a lowercase phrase.
 *
 * @example
 * ```ts
 * const reason: RejectionReason = "invalid-payload";
 * ```
 */
export type RejectionReason =
  | "not-started"
  | "disposed"
  | "invalid-input"
  | "invalid-url"
  | "route-failed"
  | "ambiguous-route"
  | "invalid-payload"
  | "interaction-conflict"
  | "expired"
  | "inbox-full"
  | "storage-unavailable";
