import { OUTCOME_TYPES } from "example-shared/lab/constants/answers";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";

/** The line that ended an intent, from its journey, or `null` while it is in the inbox. */
export const getOutcome = (journey: TimelineEntry[]) =>
  [...journey]
    .reverse()
    .find(({ type }) => type !== null && OUTCOME_TYPES.includes(type)) ?? null;
