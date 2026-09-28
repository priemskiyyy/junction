import type { FailureCode } from "src/types/internal/FailureCode";

/** Why an attempt failed, in the words its failed intent carries. */
export const FAILURE_MESSAGES = Object.freeze({
  HANDLER_FAILED: "The handler threw.",
  INVALID_HANDLER_RESULT:
    "The handler answered something other than nothing or an outcome of its execution.",
  ATTEMPTS_EXHAUSTED: "The intent used all of its attempts.",
} satisfies Record<FailureCode, string>);
