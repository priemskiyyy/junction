import type { SourceStatus } from "@priemskiyyy/junction";

/** How a source's launch read settled, in the lab's words. */
export const LAUNCH_READ_WORDS = {
  received: "handed over what Folio launched from",
  empty: "found nothing Folio launched from",
  failed: "failed",
  "timed-out": "timed out, and anything later still counts as the launch",
  none: "is not offered by this source",
} satisfies Record<
  Exclude<Extract<SourceStatus, { state: "attached" }>["initial"], "pending">,
  string
>;
