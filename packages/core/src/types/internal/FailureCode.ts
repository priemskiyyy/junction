import type { JunctionErrorCode } from "src/types/JunctionErrorCode";

export type FailureCode = Extract<
  JunctionErrorCode,
  "HANDLER_FAILED" | "INVALID_HANDLER_RESULT" | "ATTEMPTS_EXHAUSTED"
>;
