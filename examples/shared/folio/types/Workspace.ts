import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";
import type { Tone } from "example-shared/types/Tone";

export type Workspace = {
  id: WorkspaceId;
  name: string;
  description: string;
  tone: Tone;
};
