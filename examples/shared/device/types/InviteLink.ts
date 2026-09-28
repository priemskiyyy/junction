import type { PersonId } from "example-shared/folio/types/PersonId";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** An invite someone sent through an Adjust link, which installs Folio and hands it the deep link on its first launch. */
export type InviteLink = {
  id: string;
  from: { id: PersonId };
  workspace: { id: WorkspaceId };
  deeplink: string;
};
