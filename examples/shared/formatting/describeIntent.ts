import { match } from "ts-pattern";

import { PEOPLE } from "example-shared/folio/constants/people";
import { TEMPLATES } from "example-shared/folio/constants/templates";
import { WORKSPACES } from "example-shared/folio/constants/workspaces";
import type { FolioIntent } from "example-shared/junction/types/FolioIntent";

/** What an intent asks Folio to do, in a few words. */
export const describeIntent = (
  intent: FolioIntent,
  getTitle: (documentId: string) => string,
) =>
  match(intent)
    .with(
      { name: "openDocument" },
      ({ payload }) => `Open ${getTitle(payload.documentId)}`,
    )
    .with(
      { name: "openComment" },
      ({ payload }) =>
        `Show ${PEOPLE[payload.accountId].firstName}'s mention in ${getTitle(payload.documentId)}`,
    )
    .with(
      { name: "newDocument" },
      ({ payload }) => `Create ${TEMPLATES[payload.template].title}`,
    )
    .with(
      { name: "joinWorkspace" },
      ({ payload }) => `Join ${WORKSPACES[payload.workspaceId].name}`,
    )
    .exhaustive();
