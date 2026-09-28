import type { PersonId } from "example-shared/folio/types/PersonId";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** Who belongs to which workspace before anyone joins through an invite: Grace is not in Design. */
export const INITIAL_MEMBERSHIPS: Record<PersonId, WorkspaceId[]> = {
  ada: ["design", "finance"],
  grace: ["finance"],
};
