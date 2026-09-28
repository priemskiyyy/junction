import { z } from "zod";

import { createMockSource } from "src/mock/createMockSource";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { SourceObservation } from "src/types/SourceObservation";
import { ValueStore } from "src/utils/common/ValueStore";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";

export const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

export const intents = {
  openDocument: intent(
    z
      .object({
        workspaceId: z.string().min(1),
        documentId: z.string().min(1),
        accountId: z.string().optional(),
      })
      .strict(),
    { account: ({ accountId }) => accountId },
  ),
  showAnnouncement: intent(
    z.object({ announcementId: z.string().min(1) }).strict(),
  ),
};

export const authenticated = (account: string): JunctionIdentity => ({
  status: "authenticated",
  account: { id: account },
});

export const createIdentity = (initial: JunctionIdentity) => {
  const store = new ValueStore<JunctionIdentity>(initial);

  return {
    identity: Object.freeze({ get: store.get, subscribe: store.subscribe }),
    set: store.set,
  };
};

export const DOCUMENT_URL =
  "https://app.example.com/workspaces/workspace-7/documents/document-42";

export const ANNOUNCEMENT_URL = "myapp://announcements/announcement-1";

export const createJunction = ({
  initial,
  identity = authenticated("account-3"),
  now,
  timeout,
}: {
  initial?: SourceObservation<{ url: string }> | null | "hold";
  identity?: JunctionIdentity;
  now?: () => number;
  timeout?: { initial?: number; execution?: number };
} = {}) => {
  const links = createMockSource<{ url: string }>({
    resource: "linking",
    initial,
  });

  const store = createIdentity(identity);

  const junction = new Junction({
    intents,
    identity: store.identity,
    sources: { links: links.source },
    routes: ({ from }) => ({
      documentUrl: from.links.url({
        url: "https://app.example.com/workspaces/:workspaceId/documents/:documentId",
        intent: "openDocument",
        payload: ({ params, query }) => ({
          workspaceId: params.workspaceId,
          documentId: params.documentId,
          accountId: query.single("account"),
        }),
      }),
      announcementUrl: from.links.url({
        url: "myapp://announcements/:announcementId",
        intent: "showAnnouncement",
        payload: ({ params }) => ({ announcementId: params.announcementId }),
      }),
    }),
    now,
    timeout,
  });

  return { junction, links: links.control, identity: store };
};
