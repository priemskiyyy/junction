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

/** Accepts an invite for whoever signed in: Folio's service checks it, then the person joins the workspace and Folio opens it. */
export const createJoinWorkspaceHandler =
  ({
    world,
    app,
  }: {
    world: FolioWorld;
    app: FolioApp;
  }): IntentHandler<
    IntentPayload<FolioIntents["joinWorkspace"]>,
    IntentExecutionOf<FolioIntents, "joinWorkspace">
  > =>
  async (
    { inviteId, workspaceId },
    { account, signal, commit, reject, retry },
  ) => {
    try {
      const answer = await world.checkInvite({ inviteId, signal });

      return match(answer)
        .with({ status: "unknown" }, () => reject("Folio has no such invite"))
        .with({ status: "valid" }, ({ workspace, invitedBy }) => {
          if (workspace.id !== workspaceId) {
            return reject("The invite leads to another workspace");
          }

          return commit(() => {
            world.join({ account, workspaceId });
            app.selectWorkspace(0, workspaceId);
            app.announce(
              `${getPersonName(account.id)} joined ${WORKSPACES[workspaceId].name}, invited by ${getPersonName(invitedBy.id)}`,
            );
          });
        })
        .exhaustive();
    } catch {
      if (signal.aborted) {
        return;
      }

      return retry({ after: RETRY_AFTER });
    }
  };
