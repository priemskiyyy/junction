import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** One pane of Folio: the workspace it shows, the document open in it, and whether it has unsaved changes. */
export type PaneState = {
  workspace: { id: WorkspaceId };
  document: { id: string; comment: { id: string } | null } | null;
  editing: boolean;
};
