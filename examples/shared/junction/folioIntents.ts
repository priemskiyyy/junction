import { intent } from "@priemskiyyy/junction";
import { z } from "zod";

import type { DocumentTemplate } from "example-shared/folio/types/DocumentTemplate";
import type { PersonId } from "example-shared/folio/types/PersonId";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";

const WORKSPACE = z.enum(
  ["design", "finance"] satisfies [WorkspaceId, ...WorkspaceId[]],
  "Folio has no such workspace.",
);

const PERSON = z.enum(
  ["ada", "grace"] satisfies [PersonId, ...PersonId[]],
  "Folio has no such person.",
);

const SLUG = z
  .string()
  .max(40, "Keep it under 40 characters.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words joined by hyphens.");

const OPEN_DOCUMENT = z
  .object({ workspaceId: WORKSPACE, documentId: SLUG })
  .strict();

const JOIN_WORKSPACE = z
  .object({ inviteId: SLUG, workspaceId: WORKSPACE })
  .strict();

/**
 * What Folio can be asked to do from outside. A document or an invite is
 * for whoever is signed in when it runs, and survives a restart; a mention
 * names the person it is for; a new document is for whoever is signed in.
 */
export const FOLIO_INTENTS = {
  openDocument: intent(OPEN_DOCUMENT, {
    account: true,
    persist: { schema: OPEN_DOCUMENT },
  }),
  openComment: intent(
    z
      .object({
        accountId: PERSON,
        workspaceId: WORKSPACE,
        documentId: SLUG,
        commentId: SLUG,
      })
      .strict(),
    { account: ({ accountId }) => accountId },
  ),
  newDocument: intent(
    z
      .object({
        template: z.enum(
          ["blank", "meeting-notes"] satisfies [
            DocumentTemplate,
            ...DocumentTemplate[],
          ],
          "Folio has no such template.",
        ),
      })
      .strict(),
    { account: true },
  ),
  joinWorkspace: intent(JOIN_WORKSPACE, {
    account: true,
    persist: { schema: JOIN_WORKSPACE },
  }),
};
