import type { Inspection } from "src/types/Inspection";
import type { Resolution } from "src/types/internal/Resolution";
import { assertUnreachable } from "src/utils/common/assertUnreachable";
import { getFrozenIssues } from "src/utils/internal/inbox/getFrozenIssues";

export const getInspection = (resolution: Resolution): Inspection => {
  if (resolution.kind === "MATCHED") {
    return Object.freeze({
      status: "matched",
      route: Object.freeze({ id: resolution.route }),
      intent: Object.freeze({
        name: resolution.name,
        payload: resolution.prepared.payload,
      }),
    });
  }

  if (resolution.kind === "IGNORED") {
    return Object.freeze({ status: "ignored", reason: resolution.reason });
  }

  if (resolution.kind === "REJECTED") {
    return Object.freeze({
      status: "rejected",
      reason: resolution.reason,
      issues: getFrozenIssues(resolution.issues),
    });
  }

  return assertUnreachable(resolution);
};
