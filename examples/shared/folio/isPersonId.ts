import { PEOPLE } from "example-shared/folio/constants/people";
import type { PersonId } from "example-shared/folio/types/PersonId";

/** Whether an account id, as Junction reports it, is one of Folio's people. */
export const isPersonId = (id: string): id is PersonId => id in PEOPLE;
