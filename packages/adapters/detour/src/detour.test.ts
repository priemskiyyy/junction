import { intent, Junction } from "@priemskiyyy/junction";
import { expect, test } from "vitest";
import { z } from "zod";

import { detour } from "src/detour";
import { createFakeDetour } from "src/fakeDetour.fixture";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const createJunction = (fake: ReturnType<typeof createFakeDetour>) =>
  new Junction({
    intents: {
      openDocument: intent(
        z
          .object({ documentId: z.string().min(1), ref: z.string().optional() })
          .strict(),
      ),
    },
    sources: { links: detour({ sdk: fake.sdk }) },
    routes: ({ from }) => ({
      document: from.links.url({
        url: "detour://documents/:documentId",
        intent: "openDocument",
        payload: ({ params, query }) => ({
          documentId: params.documentId,
          ref: query.single("ref"),
        }),
      }),
    }),
  });

test("creating the source listens to nothing and reads no launch URL", () => {
  const fake = createFakeDetour();

  createJunction(fake);

  expect(fake.calls).toEqual([]);
});

test("the launch read waits for the provider's launch processing, and the deferred link it matched is admitted as initial and deferred", async () => {
  const fake = createFakeDetour();
  const junction = createJunction(fake);

  const started = junction.start();

  fake.resolve("/documents/document-42", "deferred");
  await tick();

  expect(junction.inbox.get()).toEqual([]);

  fake.finish();

  const report = await started;

  await tick();

  expect(report.sources).toEqual([{ name: "links", initial: "received" }]);
  expect(fake.calls).toEqual(["addEventListener url", "getInitialURL"]);
  expect(junction.inbox.get()).toMatchObject([
    {
      payload: { documentId: "document-42" },
      provenance: {
        kind: "source",
        source: { name: "links" },
        route: { id: "document" },
        initial: true,
        deferred: true,
      },
    },
  ]);
  junction.dispose();
});

test("a verified link while the app runs keeps its own query and is claimed not deferred", async () => {
  const fake = createFakeDetour();
  const junction = createJunction(fake);

  fake.finish();
  await junction.start();
  fake.resolve("/documents/document-7?ref=mail", "verified");
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      payload: { documentId: "document-7", ref: "mail" },
      provenance: { initial: false, deferred: false },
    },
  ]);
  junction.dispose();
});

test("an app opened without a link is an empty launch read once the provider finishes", async () => {
  const fake = createFakeDetour();
  const junction = createJunction(fake);

  const started = junction.start();

  fake.finish();

  const report = await started;

  expect(report.sources).toEqual([{ name: "links", initial: "empty" }]);
  expect(junction.inbox.get()).toEqual([]);
  junction.dispose();
});

test("dispose removes the listener, and the source calls nothing else", async () => {
  const fake = createFakeDetour();
  const junction = createJunction(fake);

  fake.finish();
  await junction.start();
  junction.dispose();

  expect(fake.listeners()).toBe(0);
  expect(fake.calls).toEqual([
    "addEventListener url",
    "getInitialURL",
    "remove",
  ]);
});
