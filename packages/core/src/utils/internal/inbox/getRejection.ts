import type { Admission } from "src/types/Admission";
import type { Issue } from "src/types/Issue";
import type { RejectionReason } from "src/types/RejectionReason";
import { RETRYABLE_REJECTIONS } from "src/utils/constants/rejections";
import { getFrozenIssues } from "src/utils/internal/inbox/getFrozenIssues";

export const getRejection = (
  reason: RejectionReason,
  issues: Issue[] | string,
): Admission => {
  return Object.freeze({
    status: "rejected",
    reason,
    retryable: RETRYABLE_REJECTIONS[reason],
    issues: getFrozenIssues(
      typeof issues === "string" ? [{ path: "", message: issues }] : issues,
    ),
  });
};
