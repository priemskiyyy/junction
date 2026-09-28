import { useIntent } from "@priemskiyyy/junction-react";
import type React from "react";
import type { ReactNode } from "react";

import { createJoinWorkspaceHandler } from "example-shared/folio/handlers/createJoinWorkspaceHandler";
import { createNewDocumentHandler } from "example-shared/folio/handlers/createNewDocumentHandler";
import { createOpenCommentHandler } from "example-shared/folio/handlers/createOpenCommentHandler";
import { createOpenDocumentHandler } from "example-shared/folio/handlers/createOpenDocumentHandler";
import { useLab } from "src/hooks/useLab";
import { useRuntime } from "src/hooks/useRuntime";

type FolioShellProps = { children: ReactNode };

// Mounted for as long as Folio runs, signed in or not, so what arrives before sign-in has an owner that waits for it.
export const FolioShell: React.FunctionComponent<FolioShellProps> = ({
  children,
}) => {
  const { world } = useLab();
  const { app } = useRuntime();

  useIntent("openDocument", createOpenDocumentHandler({ world, app }), {
    name: "Folio shell",
    fallback: true,
  });
  useIntent("openComment", createOpenCommentHandler({ world, app }), {
    name: "Folio shell",
  });
  useIntent("newDocument", createNewDocumentHandler({ world, app }), {
    name: "Folio shell",
  });
  useIntent("joinWorkspace", createJoinWorkspaceHandler({ world, app }), {
    name: "Folio shell",
  });

  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
};
