import type { PersonId } from "example-shared/folio/types/PersonId";

/** A message on the device with a link in it. */
export type MessageLink = {
  id: string;
  from: { id: PersonId };
  text: string;
  url: string;
};
