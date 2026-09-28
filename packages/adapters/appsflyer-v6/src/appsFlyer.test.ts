import { intent, Junction } from "@priemskiyyy/junction";
import { expect, test } from "vitest";
import { z } from "zod";

import { appsFlyer } from "src/appsFlyer";
import { createFakeAppsFlyer } from "src/fakeAppsFlyer.fixture";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const createJunction = (fake: ReturnType<typeof createFakeAppsFlyer>) =>
  new Junction({
    intents: {
      openDocument: intent(
        z.object({ documentId: z.string().min(1) }).strict(),
      ),
    },
    sources: { campaigns: appsFlyer({ sdk: fake.sdk }) },
    routes: ({ from }) => ({
      campaign: from.campaigns.event({
        intent: "openDocument",
        payload: ({ params }) => ({ documentId: params.deep_link_value }),
      }),
    }),
  });

test("creating the source listens to nothing", () => {
  const fake = createFakeAppsFlyer();

  createJunction(fake);

  expect(fake.calls).toEqual([]);
  expect(fake.listeners()).toBe(0);
});

test("a found deep link becomes the routed intent, with AppsFlyer's own claim about deferral", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);

  await junction.start();
  fake.deliver({
    deepLinkStatus: "FOUND",
    isDeferred: true,
    data: { deep_link_value: "document-42", campaign: "spring" },
  });
  fake.deliver({
    deepLinkStatus: "FOUND",
    isDeferred: false,
    data: { deep_link_value: "document-7" },
  });
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      payload: { documentId: "document-42" },
      provenance: {
        kind: "source",
        source: { name: "campaigns" },
        deferred: true,
      },
    },
    { payload: { documentId: "document-7" }, provenance: { deferred: false } },
  ]);
  junction.dispose();
});

test("a deep link AppsFlyer did not find produces nothing", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);

  await junction.start();
  fake.deliver({
    deepLinkStatus: "NOT_FOUND",
    isDeferred: false,
    data: "deep link not found",
  });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  junction.dispose();
});

test("an error result and a payload AppsFlyer could not parse are reported on the source's status, and produce no intent", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);

  await junction.start();
  fake.deliver({
    deepLinkStatus: "ERROR",
    isDeferred: false,
    data: "The Internet connection appears to be offline.",
  });

  expect(junction.source("campaigns").status.get()).toMatchObject({
    error: {
      code: "SOURCE_ERROR",
      cause: "The Internet connection appears to be offline.",
    },
  });

  fake.deliverUnparsable("{deep_link_value=document-42");
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(junction.source("campaigns").status.get()).toMatchObject({
    state: "attached",
    error: {
      code: "SOURCE_ERROR",
      cause: {
        name: "AFParseJSONException",
        data: "{deep_link_value=document-42",
      },
    },
  });
  junction.dispose();
});

test("dispose removes the listener, and the source never initializes, stops, identifies or asks for consent", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);

  await junction.start();
  junction.dispose();

  expect(fake.calls).toEqual(["onDeepLink"]);
  expect(fake.listeners()).toBe(0);
});
