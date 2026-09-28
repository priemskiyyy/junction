import type { FolioComment } from "example-shared/folio/types/FolioComment";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

export type FolioDocument = {
  id: string;
  workspace: { id: WorkspaceId };
  title: string;
  summary: string;
  author: { id: string };
  comments: FolioComment[];
};
