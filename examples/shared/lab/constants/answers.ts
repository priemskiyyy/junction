import type { JunctionDiagnosticType } from "@priemskiyyy/junction";

/** The events that answer an entry point: Junction admitted it, found it a duplicate, ignored it or refused it. */
export const ANSWER_TYPES: JunctionDiagnosticType[] = [
  "intent accepted",
  "intent duplicate",
  "observation ignored",
  "observation rejected",
];

/** The events that end an intent. */
export const OUTCOME_TYPES: JunctionDiagnosticType[] = [
  "intent acknowledged",
  "intent rejected",
  "intent expired",
  "intent cancelled",
];
