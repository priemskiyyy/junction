import type { PersonId } from "example-shared/folio/types/PersonId";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** The invites Folio's service knows, by id. */
export const INVITES: Record<
  string,
  { workspace: { id: WorkspaceId }; invitedBy: { id: PersonId } }
> = {
  "design-7f3": { workspace: { id: "design" }, invitedBy: { id: "ada" } },
};
