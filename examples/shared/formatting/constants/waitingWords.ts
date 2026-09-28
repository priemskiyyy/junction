import type { WaitingReason } from "@priemskiyyy/junction";

/** Why an intent waits, in the lab's words, as the timeline says it. */
export const WAITING_WORDS = {
  "no-consumer": "no screen takes it yet",
  "ambiguous-consumer": "two screens claim it",
  "consumer-not-ready": "its screen is not ready",
  "readiness-error": "its screen's ready check threw",
  "selection-error": "a screen's match check threw",
  "identity-restoring": "Folio is restoring who is signed in",
  authentication: "it needs someone signed in",
  "account-mismatch": "it belongs to someone else",
  capacity: "another intent is running",
  storage: "storage has not confirmed a write",
} satisfies Record<WaitingReason, string>;
