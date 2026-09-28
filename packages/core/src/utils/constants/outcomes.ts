import type { IntentOutcome } from "src/types/IntentOutcome";

/** What `commit` answers, interned because every handled outcome is the same. */
export const HANDLED_OUTCOME: IntentOutcome = Object.freeze({
  status: "handled",
});
