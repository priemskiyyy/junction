import type { InterruptionCode } from "src/types/internal/InterruptionCode";

/** Why an attempt stopped being current, in the words its interrupted intent carries. */
export const INTERRUPTION_MESSAGES = Object.freeze({
  EFFECT_UNCERTAIN:
    "The committed effect threw, so it may or may not have taken effect.",
  OWNER_DISPOSED: "The consumer running the attempt was disposed.",
  OWNER_UNMATCHED: "The consumer running the attempt stopped matching it.",
  OWNER_NOT_READY: "The consumer running the attempt stopped being ready.",
  SCOPE_CHANGED: "The consumer running the attempt changed its scope.",
  IDENTITY_CHANGED: "The identity changed while the attempt ran.",
  TIMED_OUT: "The attempt outlived its timeout.",
  PROCESS_RESTARTED:
    "The process ended while the attempt held its lease, so its effect may or may not have happened.",
} satisfies Record<InterruptionCode, string>);
