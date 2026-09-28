import type { PersonId } from "example-shared/folio/types/PersonId";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** What Folio's service answers about an invite: whose it is and where it leads. */
export type InviteAnswer =
  | {
      status: "valid";
      workspace: { id: WorkspaceId };
      invitedBy: { id: PersonId };
    }
  | { status: "unknown" };
