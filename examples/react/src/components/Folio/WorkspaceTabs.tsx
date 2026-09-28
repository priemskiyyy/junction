import type React from "react";

import { WORKSPACES } from "example-shared/folio/constants/workspaces";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";
import { segmentStyles } from "example-shared/ui/styles/segmentStyles";

type WorkspaceTabsProps = {
  label: string;
  workspaces: WorkspaceId[];
  selected: WorkspaceId;
  onSelect: (workspace: WorkspaceId) => void;
};

export const WorkspaceTabs: React.FunctionComponent<WorkspaceTabsProps> = ({
  label,
  workspaces,
  selected,
  onSelect,
}) => (
  <div
    role="tablist"
    aria-label={label}
    className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800"
  >
    {workspaces.map((id) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={id === selected}
        onClick={() => onSelect(id)}
        className={segmentStyles({ selected: id === selected })}
      >
        {WORKSPACES[id].name}
      </button>
    ))}
  </div>
);
