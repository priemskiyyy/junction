import type { FolioDocument } from "example-shared/folio/types/FolioDocument";
import type { PersonId } from "example-shared/folio/types/PersonId";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** Folio's server side: who belongs where, the documents, and how the service behaves right now. */
export type WorldState = {
  memberships: Record<PersonId, WorkspaceId[]>;
  documents: FolioDocument[];
  slow: boolean;
  offline: boolean;
};
