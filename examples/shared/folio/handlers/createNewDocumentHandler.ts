import type {
  IntentExecutionOf,
  IntentHandler,
  IntentPayload,
} from "@priemskiyyy/junction";

import { WORKSPACES } from "example-shared/folio/constants/workspaces";
import { RETRY_AFTER } from "example-shared/folio/constants/retry";
import type { FolioApp } from "example-shared/folio/types/FolioApp";
import type { FolioWorld } from "example-shared/folio/types/FolioWorld";
import type { FolioIntents } from "example-shared/junction/types/FolioIntents";

/** Creates a document from a template in the workspace on screen, once Folio's service is ready for it. */
export const createNewDocumentHandler =
  ({
    world,
    app,
  }: {
    world: FolioWorld;
    app: FolioApp;
  }): IntentHandler<
    IntentPayload<FolioIntents["newDocument"]>,
    IntentExecutionOf<FolioIntents, "newDocument">
  > =>
  async ({ template }, { account, signal, commit, retry }) => {
    try {
      await world.prepareDocument(signal);
    } catch {
      if (signal.aborted) {
        return;
      }

      return retry({ after: RETRY_AFTER });
    }

    return commit(() => {
      const workspaceId = app.getWorkspace()?.id ?? "finance";
      const document = world.createDocument({ account, workspaceId, template });

      app.show({ workspaceId, documentId: document.id });
      app.announce(
        `Created ${document.title} in ${WORKSPACES[workspaceId].name}`,
      );
    });
  };
