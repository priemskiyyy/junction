import type { Issue } from "src/types/Issue";
import type { RejectionReason } from "src/types/RejectionReason";

/**
 * What `inspect` explains about one input: the route and payload it would
 * produce, or why nothing would. It admits nothing and calls no SDK.
 *
 * @example
 * ```ts
 * const inspection = junction.inspect("links", { url: "https://app.example.com/documents/42" });
 *
 * if (inspection.status === "matched") {
 *   console.log(inspection.route.id, inspection.intent.payload);
 * }
 * ```
 */
export type Inspection =
  | {
      status: "matched";
      route: { id: string };
      intent: { name: string; payload: unknown };
    }
  | { status: "ignored"; reason: "no-route" | "owned-by-other-source" }
  | { status: "rejected"; reason: RejectionReason; issues: Issue[] };
