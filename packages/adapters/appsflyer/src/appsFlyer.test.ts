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

test("creating the source registers nothing", () => {
  const fake = createFakeAppsFlyer();

  createJunction(fake);

  expect(fake.calls).toEqual([]);
});

test("a found deep link becomes the routed intent, with AppsFlyer's own claim that it was deferred", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);

  await junction.start();
  fake.deliver({
    status: "FOUND",
    deepLink: { deep_link_value: "document-42", is_deferred: true },
  });
  fake.deliver({
    status: "FOUND",
    deepLink: { deep_link_value: "document-7" },
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
    {
      payload: { documentId: "document-7" },
      provenance: { deferred: null },
    },
  ]);
  junction.dispose();
});

test("a deep link AppsFlyer did not find produces nothing", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);

  await junction.start();
  fake.deliver({ status: "NOT_FOUND" });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  junction.dispose();
});

test("an error result is reported on the source's status and produces no intent", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);

  await junction.start();
  fake.deliver({ status: "ERROR", error: "The deep link timed out." });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(junction.source("campaigns").status.get()).toMatchObject({
    state: "attached",
    error: { code: "SOURCE_ERROR", cause: "The deep link timed out." },
  });
  junction.dispose();
});

test("a native registration that rejects is reported on the source's status", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);
  const refusal = new Error("The native module is missing.");

  fake.refuseRegistration(refusal);
  await junction.start();
  await tick();

  expect(junction.source("campaigns").status.get()).toMatchObject({
    state: "attached",
    error: { code: "SOURCE_ERROR", cause: refusal },
  });
  junction.dispose();
});

test("the source's registration replaces the application's own deep link callback, since AppsFlyer keeps one", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);
  const own: unknown[] = [];

  fake.sdk.registerDeepLinkListener({
    onDeepLinking: (data) => own.push(data),
  });
  await junction.start();
  fake.deliver({
    status: "FOUND",
    deepLink: { deep_link_value: "document-42" },
  });
  await tick();

  expect(own).toEqual([]);
  expect(junction.inbox.get()).toHaveLength(1);
  junction.dispose();
});

test("dispose unregisters on Android, and the source never initializes, starts, stops, identifies or asks for consent", async () => {
  const fake = createFakeAppsFlyer();
  const junction = createJunction(fake);

  await junction.start();
  junction.dispose();
  await tick();

  expect(fake.calls).toEqual([
    "registerDeepLinkListener",
    "unregisterDeepLinkListener",
  ]);
  expect(fake.listeners()).toBe(0);
});

test("on iOS, where AppsFlyer cannot unregister, dispose contains the rejection and nothing delivered later reaches the Junction", async () => {
  const fake = createFakeAppsFlyer({ platform: "ios" });
  const junction = createJunction(fake);

  await junction.start();
  junction.dispose();
  await tick();
  fake.deliver({
    status: "FOUND",
    deepLink: { deep_link_value: "document-42" },
  });
  await tick();

  expect(fake.listeners()).toBe(1);
  expect(junction.inbox.get()).toEqual([]);
});
