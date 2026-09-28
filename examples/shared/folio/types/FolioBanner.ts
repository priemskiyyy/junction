import type { Tone } from "example-shared/types/Tone";

/** A line Folio shows at the top of its screen after it handled an intent. */
export type FolioBanner = { id: number; text: string; tone: Tone };
