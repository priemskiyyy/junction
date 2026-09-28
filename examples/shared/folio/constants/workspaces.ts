import type { Workspace } from "example-shared/folio/types/Workspace";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

/** Folio's workspaces. */
export const WORKSPACES: Record<WorkspaceId, Workspace> = {
  design: {
    id: "design",
    name: "Design",
    description: "Brand, launch and research",
    tone: "accent",
  },
  finance: {
    id: "finance",
    name: "Finance",
    description: "Budgets and invoices",
    tone: "positive",
  },
};

/** The workspaces in the order Folio's tabs show them. */
export const WORKSPACE_IDS: WorkspaceId[] = ["design", "finance"];
