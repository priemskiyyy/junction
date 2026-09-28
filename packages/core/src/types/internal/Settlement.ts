import type { FailureCode } from "src/types/internal/FailureCode";
import type { InterruptionCode } from "src/types/internal/InterruptionCode";
import type { JunctionError } from "src/utils/JunctionError";

export type Settlement =
  | { kind: "ACKNOWLEDGED"; ignored: "threw" | "answered" | null }
  | { kind: "REJECTED"; reason: string }
  | { kind: "RETRY"; after: number }
  | { kind: "FAILED"; error: JunctionError<FailureCode> }
  | { kind: "INTERRUPTED"; error: JunctionError<InterruptionCode> }
  | { kind: "EXPIRED" }
  | { kind: "CANCELLED" };
