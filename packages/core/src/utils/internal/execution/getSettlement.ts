import type { InterruptionCode } from "src/types/internal/InterruptionCode";
import type { Invalidation } from "src/types/internal/Invalidation";
import type { Settlement } from "src/types/internal/Settlement";
import { isPlainObject } from "src/utils/common/isPlainObject";
import { MAX_DURATION } from "src/utils/constants/defaults";
import { FAILURE_MESSAGES } from "src/utils/constants/failures";
import { INTERRUPTION_MESSAGES } from "src/utils/constants/interruptions";
import { IDENTIFIER_LENGTH } from "src/utils/constants/limits";
import { JunctionError } from "src/utils/JunctionError";

const getInvalidResult = (): Settlement => ({
  kind: "FAILED",
  error: new JunctionError({
    code: "INVALID_HANDLER_RESULT",
    message: FAILURE_MESSAGES.INVALID_HANDLER_RESULT,
  }),
});

const getInterruption = (
  code: InterruptionCode,
  cause?: unknown,
): Settlement => ({
  kind: "INTERRUPTED",
  error: new JunctionError({
    code,
    message: INTERRUPTION_MESSAGES[code],
    cause,
  }),
});

const ACKNOWLEDGED: Settlement = Object.freeze({
  kind: "ACKNOWLEDGED",
  ignored: null,
});

const getReturnedSettlement = (value: unknown): Settlement => {
  if (value === undefined) {
    return ACKNOWLEDGED;
  }

  if (!isPlainObject(value)) {
    return getInvalidResult();
  }

  let outcome: { status: unknown; reason: unknown; after: unknown };

  // A handler outside the types can answer an object whose reads throw, which answers nothing.
  try {
    outcome = {
      status: value.status,
      reason: value.reason,
      after: value.after,
    };
  } catch {
    return getInvalidResult();
  }

  const { status, reason, after } = outcome;

  if (status === "handled") {
    return ACKNOWLEDGED;
  }

  // No type can say a length or a range, so the settlement checks what the outcome carries.
  if (
    status === "rejected" &&
    typeof reason === "string" &&
    reason.length > 0 &&
    reason.length <= IDENTIFIER_LENGTH
  ) {
    return { kind: "REJECTED", reason };
  }

  if (
    status === "retry" &&
    typeof after === "number" &&
    Number.isInteger(after) &&
    after >= 0 &&
    after <= MAX_DURATION
  ) {
    return { kind: "RETRY", after };
  }

  return getInvalidResult();
};

// The latch wins, so what the handler does after its commit is only named, never applied.
const getLatchedSettlement = (
  outcome:
    { kind: "RETURNED"; value: unknown } | { kind: "THREW"; error: unknown },
): Settlement => {
  if (outcome.kind === "THREW") {
    return { kind: "ACKNOWLEDGED", ignored: "threw" };
  }

  if (getReturnedSettlement(outcome.value).kind === "ACKNOWLEDGED") {
    return ACKNOWLEDGED;
  }

  return { kind: "ACKNOWLEDGED", ignored: "answered" };
};

export const getSettlement = ({
  latch,
  effectError,
  invalidation,
  outcome,
}: {
  latch: "HANDLED" | "UNCERTAIN" | null;
  effectError?: unknown;
  invalidation: Invalidation | null;
  outcome:
    { kind: "RETURNED"; value: unknown } | { kind: "THREW"; error: unknown };
}): Settlement => {
  if (latch === "HANDLED") {
    return getLatchedSettlement(outcome);
  }

  if (invalidation?.kind === "EXPIRED") {
    return { kind: "EXPIRED" };
  }

  if (invalidation?.kind === "CANCELLED") {
    return { kind: "CANCELLED" };
  }

  if (latch === "UNCERTAIN") {
    return getInterruption("EFFECT_UNCERTAIN", effectError);
  }

  if (invalidation?.kind === "INTERRUPTED") {
    return getInterruption(invalidation.code);
  }

  if (outcome.kind === "THREW") {
    return {
      kind: "FAILED",
      error: new JunctionError({
        code: "HANDLER_FAILED",
        message: FAILURE_MESSAGES.HANDLER_FAILED,
        cause: outcome.error,
      }),
    };
  }

  return getReturnedSettlement(outcome.value);
};
