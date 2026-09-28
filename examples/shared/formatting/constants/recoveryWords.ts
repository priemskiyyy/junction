import type { RecoveryResult } from "@priemskiyyy/junction";

/** Why Junction refused a retry or a cancel, in the lab's words. */
export const RECOVERY_WORDS = {
  unknown: "Junction no longer has it",
  "not-started": "Folio's Junction has not started",
  disposed: "Folio quit",
  "not-recoverable": "only a failed or interrupted intent can be retried",
  running: "it is running",
  expired: "its deadline passed",
  "attempts-exhausted": "every attempt was used",
} satisfies Record<
  Extract<RecoveryResult, { status: "refused" }>["reason"],
  string
>;
