import type { JunctionDiagnosticType } from "@priemskiyyy/junction";

import type { Tone } from "example-shared/types/Tone";

/** One line of the lab's timeline: a diagnostic event of Folio's Junction, or a line the lab wrote about the device. */
export type TimelineEntry = {
  id: number;
  timestamp: number;
  /** The diagnostic event's type, or `null` for a line about the device. */
  type: JunctionDiagnosticType | null;
  source: { name: string } | null;
  intent: { id: string } | null;
  line: string;
  tone: Tone;
  launch: { number: number };
};
