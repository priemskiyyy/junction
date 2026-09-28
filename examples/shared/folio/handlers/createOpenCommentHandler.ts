import type {
  IntentExecutionOf,
  IntentHandler,
  IntentPayload,
} from "@priemskiyyy/junction";
import { match } from "ts-pattern";

import { RETRY_AFTER } from "example-shared/folio/constants/retry";
import type { FolioApp } from "example-shared/folio/types/FolioApp";
import type { FolioWorld } from "example-shared/folio/types/FolioWorld";
import { getPersonName } from "example-shared/formatting/getPersonName";
import type { FolioIntents } from "example-shared/junction/types/FolioIntents";

/** Opens the document a mention is in and points at the comment. Junction runs it only for the person the mention names. */
export const createOpenCommentHandler =
  ({
    world,
    app,
  }: {
    world: FolioWorld;
    app: FolioApp;
  }): IntentHandler<
    IntentPayload<FolioIntents["openComment"]>,
    IntentExecutionOf<FolioIntents, "openComment">
  > =>
  async (
    { workspaceId, documentId, commentId },
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
            app.show({ workspaceId, documentId, commentId });
            app.announce(
              `Showing the mention for ${getPersonName(account.id)} in ${document.title}`,
            );
          }),
        )
        .with({ status: "no-access" }, () =>
          reject(`${getPersonName(account.id)} may not see that document`),
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
