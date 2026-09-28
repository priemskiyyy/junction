import type { PersonId } from "example-shared/folio/types/PersonId";

/** What the device keeps across launches: how Folio was installed, who is signed in, and how the platform delivers a launch press. */
export type DeviceState = {
  install: { link: { deeplink: string } | null; launches: number };
  session: { person: { id: PersonId } } | null;
  /** Whether the platform hands the press that launched Folio to its listener as well as to its launch read. */
  race: boolean;
};
