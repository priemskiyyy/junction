import type { LabRuntime } from "example-shared/lab/types/LabRuntime";
import type { Tone } from "example-shared/types/Tone";

/** How the page names whether Folio runs. */
export const APP_STATES: Record<
  LabRuntime["state"],
  { label: string; tone: Tone }
> = {
  running: { label: "Folio is running", tone: "positive" },
  quit: { label: "Folio quit", tone: "neutral" },
};
