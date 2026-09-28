import type { KnobId } from "example-shared/lab/types/KnobId";
import type { Tone } from "example-shared/types/Tone";

/** What an action of the lab showed once it ran: the guarantee that held, and what happened. */
export type LabNotice = {
  id: number;
  knob: KnobId;
  title: string;
  body: string;
  tone: Tone;
};
