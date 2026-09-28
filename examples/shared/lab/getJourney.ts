import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";

/** Every timeline line about one intent, oldest first. */
export const getJourney = (timeline: TimelineEntry[], intentId: string) =>
  timeline.filter(({ intent }) => intent?.id === intentId).reverse();
