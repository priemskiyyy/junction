import { intent, Junction, JunctionError } from "@priemskiyyy/junction";
import { expect, test } from "vitest";
import { z } from "zod";

import { createFakeExpoLinking } from "src/fakeExpoLinking.fixture";
import { createFakeLinking } from "src/fakeLinking.fixture";
import { linking } from "src/linking";
import type { LinkingLike } from "src/types/LinkingLike";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const DOCUMENT_URL = "https://app.example.com/documents/document-42";

const createJunction = <TSdk extends LinkingLike>(sdk: TSdk) =>
  new Junction({
    intents: {
      openDocument: intent(
        z.object({ documentId: z.string().min(1) }).strict(),
      ),
    },
    sources: { links: linking({ sdk }) },
    routes: ({ from }) => ({
      document: from.links.url({
        url: "https://app.example.com/documents/:documentId",
        intent: "openDocument",
        payload: ({ params }) => ({ documentId: params.documentId }),
      }),
    }),
  });

test("creating the source subscribes to nothing and reads no launch URL", () => {
  const fake = createFakeLinking({ initial: DOCUMENT_URL });

  createJunction(fake.sdk);

  expect(fake.calls).toEqual([]);
  expect(fake.listeners()).toBe(0);
});

test("a link opened while the app runs becomes the routed intent", async () => {
  const fake = createFakeLinking();
  const junction = createJunction(fake.sdk);

  await junction.start();
  fake.open(DOCUMENT_URL);
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      name: "openDocument",
      payload: { documentId: "document-42" },
      provenance: {
        kind: "source",
        source: { name: "links" },
        route: { id: "document" },
        initial: false,
        deferred: null,
      },
    },
  ]);
  junction.dispose();
});

test("the link that launched the app is read once, after the listener exists, and admitted as initial", async () => {
  const fake = createFakeLinking({ initial: DOCUMENT_URL });
  const junction = createJunction(fake.sdk);

  const report = await junction.start();

  await tick();

  expect(report.sources).toEqual([{ name: "links", initial: "received" }]);
  expect(fake.calls).toEqual([["addEventListener", "url"], ["getInitialURL"]]);
  expect(junction.inbox.get()).toMatchObject([
    {
      payload: { documentId: "document-42" },
      provenance: { kind: "source", initial: true },
    },
  ]);
  junction.dispose();
});

test.each([null, undefined])(
  "a launch without a link, reported as %s, is an empty launch read",
  async (initial) => {
    const fake = createFakeLinking();
    const junction = createJunction(fake.sdk);

    fake.launch(initial);

    const report = await junction.start();

    await tick();

    expect(report.sources).toEqual([{ name: "links", initial: "empty" }]);
    expect(junction.inbox.get()).toEqual([]);
    junction.dispose();
  },
);

test("a launch read that rejects is a failed read, and later links still arrive", async () => {
  const fake = createFakeLinking();
  const junction = createJunction(fake.sdk);

  fake.failLaunch(new Error("No current activity."));

  const report = await junction.start();

  fake.open(DOCUMENT_URL);
  await tick();

  expect(report.sources).toEqual([{ name: "links", initial: "failed" }]);
  expect(junction.inbox.get()).toMatchObject([
    { payload: { documentId: "document-42" } },
  ]);
  junction.dispose();
});

test("dispose removes the listener, and the source never opens a URL, checks one or changes the provider", async () => {
  const fake = createFakeLinking();
  const junction = createJunction(fake.sdk);

  await junction.start();
  junction.dispose();

  expect(fake.listeners()).toBe(0);
  expect(fake.calls).toEqual([
    ["addEventListener", "url"],
    ["getInitialURL"],
    ["remove"],
  ]);
});

test("with the expo-linking module, the source reads React Native's launch URL and never reads or clears Expo's cached URL", async () => {
  const fake = createFakeExpoLinking({ initial: DOCUMENT_URL });
  const junction = createJunction(fake.sdk);

  const report = await junction.start();

  fake.open("https://app.example.com/documents/document-7");
  await tick();
  junction.dispose();

  expect(report.sources).toEqual([{ name: "links", initial: "received" }]);
  expect(junction.inbox.get().map(({ payload }) => payload)).toEqual([
    { documentId: "document-42" },
    { documentId: "document-7" },
  ]);
  expect(fake.calls).toEqual([]);
  expect(fake.reactNative.calls).toEqual([
    ["addEventListener", "url"],
    ["getInitialURL"],
    ["remove"],
  ]);
});

test("React Native's and Expo's Linking are one native feed, so two Linking sources in one Junction are misconfiguration", () => {
  const reactNative = createFakeLinking();
  const expo = createFakeExpoLinking();

  expect(
    () =>
      new Junction({
        intents: {},
        sources: {
          links: linking({ sdk: reactNative.sdk }),
          expoLinks: linking({ sdk: expo.sdk }),
        },
      }),
  ).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message:
        'sources.expoLinks and sources.links both listen to "linking"; one native feed has one owner.',
    }),
  );
});
