import { isPersonId } from "example-shared/folio/isPersonId";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";
import type { WorldState } from "example-shared/folio/types/WorldState";

/** The workspaces an account belongs to, as Folio's tabs list them. */
export const getWorkspacesOf = (
  state: WorldState,
  account: { id: string },
): WorkspaceId[] => {
  if (!isPersonId(account.id)) {
    return [];
  }

  return state.memberships[account.id];
};
