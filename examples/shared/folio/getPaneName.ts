import { PANE_NAMES } from "example-shared/folio/constants/panes";
import { WORKSPACES } from "example-shared/folio/constants/workspaces";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** The name a pane registers its consumer with: where it sits, and the workspace it shows. */
export const getPaneName = ({
  index,
  total,
  workspace,
}: {
  index: number;
  total: number;
  workspace: { id: WorkspaceId };
}) =>
  `${PANE_NAMES[total]?.[index] ?? "Pane"} · ${WORKSPACES[workspace.id].name}`;
