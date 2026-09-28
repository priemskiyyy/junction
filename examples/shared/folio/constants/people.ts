import type { Person } from "example-shared/folio/types/Person";
import type { PersonId } from "example-shared/folio/types/PersonId";

/** The people who sign in to Folio on the lab's device. */
export const PEOPLE: Record<PersonId, Person> = {
  ada: {
    id: "ada",
    name: "Ada Lovelace",
    firstName: "Ada",
    initials: "AL",
    role: "Design lead",
    tone: "accent",
  },
  grace: {
    id: "grace",
    name: "Grace Hopper",
    firstName: "Grace",
    initials: "GH",
    role: "Finance",
    tone: "positive",
  },
};

/** The people in the order the sign-in screen offers them. */
export const PERSON_IDS: PersonId[] = ["ada", "grace"];
