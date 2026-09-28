import { intent, Junction } from "@priemskiyyy/junction";
import { expect, test } from "vitest";
import { z } from "zod";

import { adjust } from "src/adjust";
import { createFakeAdjust } from "src/fakeAdjust.fixture";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const createJunction = (fake: ReturnType<typeof createFakeAdjust>) =>
  new Junction({
    intents: {
      openDocument: intent(
        z.object({ documentId: z.string().min(1) }).strict(),
      ),
    },
    sources: { installs: adjust({ sdk: fake.sdk }) },
    routes: ({ from }) => ({
      document: from.installs.url({
        url: "myapp://documents/:documentId",
        intent: "openDocument",
        payload: ({ params }) => ({ documentId: params.documentId }),
      }),
    }),
  });

test("creating the source sets no callback", () => {
  const fake = createFakeAdjust();

  createJunction(fake);

  expect(fake.calls).toEqual([]);
});

test("start sets the callback synchronously, so initSdk right after it delivers the deferred link as a deferred intent", async () => {
  const fake = createFakeAdjust();
  const junction = createJunction(fake);

  const started = junction.start();

  fake.initSdk();
  await started;
  fake.attribute("myapp://documents/document-42");
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      payload: { documentId: "document-42" },
      provenance: {
        kind: "source",
        source: { name: "installs" },
        route: { id: "document" },
        initial: false,
        deferred: true,
      },
    },
  ]);
  junction.dispose();
});

test("an attribution without a link is no intent and no error", async () => {
  const fake = createFakeAdjust();
  const junction = createJunction(fake);

  await junction.start();
  fake.initSdk();
  fake.attributeWithoutLink();
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(junction.source("installs").status.get()).toMatchObject({
    error: null,
  });
  junction.dispose();
});

test("the source sets only its callback: it never initializes Adjust, disables opening or sets other callbacks", async () => {
  const fake = createFakeAdjust();
  const junction = createJunction(fake);

  await junction.start();
  junction.dispose();

  expect(fake.calls).toEqual(["setDeferredDeeplinkCallback"]);
});
