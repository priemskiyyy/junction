import type {
  IntentExecutionOf,
  IntentHandler,
  IntentPayload,
} from "@priemskiyyy/junction";
import { match } from "ts-pattern";

import { WORKSPACES } from "example-shared/folio/constants/workspaces";
import { RETRY_AFTER } from "example-shared/folio/constants/retry";
import type { FolioApp } from "example-shared/folio/types/FolioApp";
import type { FolioWorld } from "example-shared/folio/types/FolioWorld";
import { getPersonName } from "example-shared/formatting/getPersonName";
import type { FolioIntents } from "example-shared/junction/types/FolioIntents";

/**
 * Opens a document once Folio's service answers: in the pane given, or in
 * the pane on its workspace. It rejects a document its account may not see,
 * and asks to retry while the service is down.
 */
export const createOpenDocumentHandler =
  ({
    world,
    app,
    pane,
  }: {
    world: FolioWorld;
    app: FolioApp;
    pane?: number;
  }): IntentHandler<
    IntentPayload<FolioIntents["openDocument"]>,
    IntentExecutionOf<FolioIntents, "openDocument">
  > =>
  async (
    { workspaceId, documentId },
    { account, signal, commit, reject, retry },
  ) => {
    try {
      const answer = await world.loadDocument({
        workspaceId,
        documentId,
        account,
        signal,
      });

      return match(answer)
        .with({ status: "found" }, ({ document }) =>
          commit(() => {
            app.show({ workspaceId, documentId }, pane);
            app.announce(`Opened ${document.title}`);
          }),
        )
        .with({ status: "no-access" }, () =>
          reject(
            `${getPersonName(account.id)} is not a member of ${WORKSPACES[workspaceId].name}`,
          ),
        )
        .with({ status: "missing" }, () => reject("Folio has no such document"))
        .exhaustive();
    } catch {
      if (signal.aborted) {
        return;
      }

      return retry({ after: RETRY_AFTER });
    }
  };
