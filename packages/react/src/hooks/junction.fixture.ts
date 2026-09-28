import { intent, Junction } from "@priemskiyyy/junction";
import type { JunctionIdentity } from "@priemskiyyy/junction";
import { createMockSource } from "@priemskiyyy/junction/mock";
import { z } from "zod";

export const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

export const createGate = () => {
  let open = () => {};

  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });

  return { promise, open: () => open() };
};

const intents = {
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

const IDENTITY: JunctionIdentity = Object.freeze({
  status: "authenticated",
  account: Object.freeze({ id: "account-3" }),
});

export const createJunction = () => {
  const links = createMockSource<{ url: string }>({ resource: "linking" });

  const junction = new Junction({
    intents,
    identity: { get: () => IDENTITY, subscribe: () => () => {} },
    sources: { links: links.source },
  });

  return { junction, links };
};
