import { PEOPLE } from "example-shared/folio/constants/people";
import { isPersonId } from "example-shared/folio/isPersonId";

/** An account id, as Junction reports it, as the first name of the person it belongs to. */
export const getPersonName = (id: string) => {
  if (!isPersonId(id)) {
    return id;
  }

  return PEOPLE[id].firstName;
};
