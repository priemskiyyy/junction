import type { LabRuntime } from "example-shared/lab/types/LabRuntime";
import type { Tone } from "example-shared/types/Tone";

/** Whether Folio runs, as the pill beside its mark says it. */
export const FOLIO_STATES = {
  running: { label: "Running", tone: "positive" },
  quit: { label: "Closed", tone: "neutral" },
} satisfies Record<LabRuntime["state"], { label: string; tone: Tone }>;
