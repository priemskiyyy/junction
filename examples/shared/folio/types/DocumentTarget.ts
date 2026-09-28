import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** A document to show, and the comment to point at in it. */
export type DocumentTarget = {
  workspaceId: WorkspaceId;
  documentId: string;
  commentId?: string;
};
