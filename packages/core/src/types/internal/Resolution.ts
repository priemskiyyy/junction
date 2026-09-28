import type { Issue } from "src/types/Issue";
import type { PreparedIntent } from "src/types/internal/PreparedIntent";
import type { RejectionReason } from "src/types/RejectionReason";

export type Resolution =
  | {
      kind: "MATCHED";
      route: string;
      name: string;
      prepared: Extract<PreparedIntent, { kind: "PREPARED" }>;
    }
  | { kind: "IGNORED"; reason: "no-route" | "owned-by-other-source" }
  | { kind: "REJECTED"; reason: RejectionReason; issues: Issue[] };
