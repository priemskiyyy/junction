import type { Invalidation } from "src/types/internal/Invalidation";
import { INTERRUPTION_MESSAGES } from "src/utils/constants/interruptions";
import { JunctionError } from "src/utils/JunctionError";

const STALE_REASONS = Object.freeze({
  EXPIRED: "The intent expired.",
  CANCELLED: "The intent was cancelled.",
  DISPOSED: "The Junction was disposed.",
  SETTLED: "Its handler already answered.",
} satisfies Record<Exclude<Invalidation["kind"], "INTERRUPTED">, string>);

const getReason = (invalidation: Invalidation) => {
  if (invalidation.kind === "INTERRUPTED") {
    return INTERRUPTION_MESSAGES[invalidation.code];
  }

  return STALE_REASONS[invalidation.kind];
};

export const getStaleError = (invalidation: Invalidation) =>
  new JunctionError({
    code: "STALE_EXECUTION",
    message: `The attempt is no longer current. ${getReason(invalidation)}`,
  });
