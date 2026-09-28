import type { Issue } from "src/types/Issue";
import type { RejectionReason } from "src/types/RejectionReason";

/**
 * What became of one observation or dispatch: a new intent, a duplicate of a
 * known one, nothing, or a refusal. Admission is not handling: the intent runs
 * later, for its owner.
 *
 * @example
 * ```ts
 * const admission = await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
 *
 * if (admission.status === "accepted") {
 *   console.log(admission.intent.id);
 * }
 * ```
 */
export type Admission =
  | {
      status: "accepted";
      intent: { id: string };
      /** `committed` once the storage confirmed its write; `memory` for an intent that does not persist. */
      durability: "memory" | "committed";
    }
  | {
      status: "duplicate";
      intent: { id: string };
      durability: "memory" | "committed";
    }
  | { status: "ignored"; reason: "no-route" | "owned-by-other-source" }
  | {
      status: "rejected";
      reason: RejectionReason;
      /** Whether the same observation may succeed later, such as when the inbox has room again. */
      retryable: boolean;
      issues: Issue[];
    }
  | { status: "unconfirmed"; intent: { id: string } };
