import type { PersonId } from "example-shared/folio/types/PersonId";
import type { Tone } from "example-shared/types/Tone";

export type Person = {
  id: PersonId;
  name: string;
  firstName: string;
  initials: string;
  role: string;
  tone: Tone;
};
