import type { InterruptionCode } from "src/types/internal/InterruptionCode";

export type Invalidation =
  | { kind: "INTERRUPTED"; code: InterruptionCode }
  | { kind: "EXPIRED" }
  | { kind: "CANCELLED" }
  | { kind: "DISPOSED" }
  | { kind: "SETTLED" };
