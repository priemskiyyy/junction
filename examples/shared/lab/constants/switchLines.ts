import type { SwitchKnobId } from "example-shared/lab/types/KnobId";

/** The timeline line each switch writes when it turns on, and when it turns off. */
export const SWITCH_LINES: Record<SwitchKnobId, { on: string; off: string }> = {
  slow: {
    on: "Folio's document service slowed to 3.5 seconds",
    off: "Folio's document service is fast again",
  },
  offline: {
    on: "Folio's document service went offline",
    off: "Folio's document service is back online",
  },
  "failing-writes": {
    on: "The device's storage started rejecting writes",
    off: "The device's storage accepts writes again",
  },
  race: {
    on: "The platform now delivers a launch press twice",
    off: "The platform delivers a launch press once",
  },
};
