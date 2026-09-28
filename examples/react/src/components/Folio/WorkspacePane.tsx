import { useIntent, useJunction } from "@priemskiyyy/junction-react";
import type React from "react";

import { createOpenDocumentHandler } from "example-shared/folio/handlers/createOpenDocumentHandler";
import { getPaneName } from "example-shared/folio/getPaneName";
import { getWorkspacesOf } from "example-shared/folio/getWorkspacesOf";
import type { PaneState } from "example-shared/folio/types/PaneState";
import { DocumentList } from "src/components/Folio/DocumentList";
import { DocumentView } from "src/components/Folio/DocumentView";
import { WorkspaceTabs } from "src/components/Folio/WorkspaceTabs";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { useRuntime } from "src/hooks/useRuntime";

type WorkspacePaneProps = {
  pane: PaneState;
  index: number;
  total: number;
  account: { id: string };
};

// Each pane owns the documents of the workspace it shows, and is not ready while it has unsaved changes.
export const WorkspacePane: React.FunctionComponent<WorkspacePaneProps> = ({
  pane,
  index,
  total,
  account,
}) => {
  const lab = useLab();
  const junction = useJunction();
  const { app } = useRuntime();
  const world = useObservable(lab.world.state);
  const name = getPaneName({ index, total, workspace: pane.workspace });

  useIntent(
    "openDocument",
    createOpenDocumentHandler({ world: lab.world, app, pane: index }),
    {
      name,
      match: ({ workspaceId }) => workspaceId === pane.workspace.id,
      ready: !pane.editing,
    },
  );

  const documents = world.documents.filter(
    (document) => document.workspace.id === pane.workspace.id,
  );

  const open = documents.find(({ id }) => id === pane.document?.id);
  const related = documents.find(({ id }) => id !== open?.id) ?? null;

  return (
    <section
      aria-label={name}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
    >
      <p className="font-mono text-[0.625rem] font-semibold tracking-wide text-zinc-400 uppercase">
        {name}
      </p>
      <WorkspaceTabs
        label={`${name}: workspaces`}
        workspaces={getWorkspacesOf(world, account)}
        selected={pane.workspace.id}
        onSelect={(workspace) => app.selectWorkspace(index, workspace)}
      />
      {open === undefined ? (
        <DocumentList
          documents={documents}
          onOpen={(documentId) =>
            app.show({ workspaceId: pane.workspace.id, documentId }, index)
          }
        />
      ) : (
        <DocumentView
          document={open}
          comment={pane.document?.comment ?? null}
          editing={pane.editing}
          related={related}
          onBack={() => app.closeDocument(index)}
          onEditingChange={(editing) => app.setEditing(index, editing)}
          onRelatedPress={(document) =>
            junction.dispatch("openDocument", {
              workspaceId: document.workspace.id,
              documentId: document.id,
            })
          }
        />
      )}
    </section>
  );
};
