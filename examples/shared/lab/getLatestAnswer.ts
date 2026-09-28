import { ANSWER_TYPES } from "example-shared/lab/constants/answers";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";

/** The newest line that answers an entry point, or `null` before any arrived. */
export const getLatestAnswer = (timeline: TimelineEntry[]) =>
  timeline.find(({ type }) => type !== null && ANSWER_TYPES.includes(type)) ??
  null;
