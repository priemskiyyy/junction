import type { JunctionDiagnosticType } from "@priemskiyyy/junction";

import {
  ANSWER_TYPES,
  OUTCOME_TYPES,
} from "example-shared/lab/constants/answers";

/** The events the toast tells: how Junction answered an entry point, why an intent waits, and how it ended. */
export const TOAST_TYPES: JunctionDiagnosticType[] = [
  ...ANSWER_TYPES,
  "intent waiting",
  ...OUTCOME_TYPES,
  "intent failed",
  "intent interrupted",
  "retry scheduled",
];
