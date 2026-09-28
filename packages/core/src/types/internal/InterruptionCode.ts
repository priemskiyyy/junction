import type { JunctionErrorCode } from "src/types/JunctionErrorCode";

export type InterruptionCode = Extract<
  JunctionErrorCode,
  | "EFFECT_UNCERTAIN"
  | "OWNER_DISPOSED"
  | "OWNER_UNMATCHED"
  | "OWNER_NOT_READY"
  | "SCOPE_CHANGED"
  | "IDENTITY_CHANGED"
  | "TIMED_OUT"
  | "PROCESS_RESTARTED"
>;
