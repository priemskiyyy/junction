import type { RejectionReason } from "@priemskiyyy/junction";

/** Why Junction refused an entry point, in the lab's words. */
export const REJECTION_WORDS = {
  "not-started": "Folio's Junction has not started",
  disposed: "Folio's Junction was disposed",
  "invalid-input": "the source's input is not plain data",
  "invalid-url": "the URL breaks Junction's URL grammar",
  "route-failed": "the route's payload function threw",
  "ambiguous-route": "two routes claim it",
  "invalid-payload": "the payload fails the intent's schema",
  "interaction-conflict": "the same occurrence already made another intent",
  expired: "it was already past its deadline",
  "inbox-full": "the inbox is full",
  "storage-unavailable": "storage is blocked, and the intent persists",
} satisfies Record<RejectionReason, string>;
