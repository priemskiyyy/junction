import type { RejectionReason } from "src/types/RejectionReason";

/** Whether an observation or a dispatch refused for each reason may succeed when it is tried again later. */
export const RETRYABLE_REJECTIONS = Object.freeze({
  "not-started": true,
  disposed: false,
  "invalid-input": false,
  "invalid-url": false,
  "route-failed": false,
  "ambiguous-route": false,
  "invalid-payload": false,
  "interaction-conflict": false,
  expired: false,
  "inbox-full": true,
  "storage-unavailable": true,
} satisfies Record<RejectionReason, boolean>);
