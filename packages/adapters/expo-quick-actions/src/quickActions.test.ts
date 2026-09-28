import { intent, Junction } from "@priemskiyyy/junction";
import { expect, test } from "vitest";
import { z } from "zod";

import { createFakeQuickActions } from "src/fakeQuickActions.fixture";
import { quickActions } from "src/quickActions";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const COMPOSE = { id: "compose", params: { documentId: "document-42" } };

const createJunction = (fake: ReturnType<typeof createFakeQuickActions>) =>
  new Junction({
    intents: {
      openDocument: intent(
        z.object({ documentId: z.string().min(1) }).strict(),
      ),
      search: intent(z.object({}).strict()),
    },
    sources: { shortcuts: quickActions({ sdk: fake.sdk }) },
    routes: ({ from }) => ({
      compose: from.shortcuts.event({
        intent: "openDocument",
        match: ({ action }) => action.id === "compose",
        payload: ({ action }) => ({ documentId: action.params.documentId }),
      }),
      search: from.shortcuts.event({
        intent: "search",
        match: ({ action }) => action.id === "search",
        payload: ({ action }) => action.params,
      }),
    }),
  });

test("creating the source listens to nothing and reads no action", () => {
  const fake = createFakeQuickActions();

  createJunction(fake);

  expect(fake.calls).toEqual([]);
});

test("the action that launched the app is the launch read, after the listener exists", async () => {
  const fake = createFakeQuickActions();
  const junction = createJunction(fake);

  fake.launch(COMPOSE);

  const report = await junction.start();

  await tick();

  expect(report.sources).toEqual([{ name: "shortcuts", initial: "received" }]);
  expect(fake.calls).toEqual(["addListener", "initial"]);
  expect(junction.inbox.get()).toMatchObject([
    {
      name: "openDocument",
      payload: { documentId: "document-42" },
      provenance: {
        kind: "source",
        source: { name: "shortcuts" },
        initial: true,
      },
    },
  ]);
  junction.dispose();
});

test.each([null, undefined])(
  "a launch without an action, answered as %s, is an empty launch read",
  async (initial) => {
    const fake = createFakeQuickActions();
    const junction = createJunction(fake);

    fake.launch(initial);

    const report = await junction.start();

    await tick();

    expect(report.sources).toEqual([{ name: "shortcuts", initial: "empty" }]);
    expect(junction.inbox.get()).toEqual([]);
    junction.dispose();
  },
);

test("an action chosen while the app runs becomes the intent its id routes to, with empty params when native answers none", async () => {
  const fake = createFakeQuickActions();
  const junction = createJunction(fake);

  await junction.start();
  fake.perform({ id: "search", params: null });
  fake.perform(COMPOSE);
  await tick();

  expect(
    junction.inbox
      .get()
      .map(({ name, payload, provenance }) => ({ name, payload, provenance })),
  ).toEqual([
    {
      name: "search",
      payload: {},
      provenance: {
        kind: "source",
        source: { name: "shortcuts" },
        route: { id: "search" },
        initial: false,
        deferred: null,
      },
    },
    {
      name: "openDocument",
      payload: { documentId: "document-42" },
      provenance: {
        kind: "source",
        source: { name: "shortcuts" },
        route: { id: "compose" },
        initial: false,
        deferred: null,
      },
    },
  ]);
  junction.dispose();
});

test("the launch action that reaches the listener too is a second intent, since a quick action carries no occurrence id", async () => {
  const fake = createFakeQuickActions();
  const junction = createJunction(fake);

  fake.launch(COMPOSE);
  await junction.start();
  fake.perform(COMPOSE);
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    { payload: { documentId: "document-42" }, provenance: { initial: true } },
    { payload: { documentId: "document-42" }, provenance: { initial: false } },
  ]);
  junction.dispose();
});

test("dispose removes the listener, and the source never sets or queries the app's items", async () => {
  const fake = createFakeQuickActions();
  const junction = createJunction(fake);

  await junction.start();
  junction.dispose();

  expect(fake.listeners()).toBe(0);
  expect(fake.calls).toEqual(["addListener", "initial", "remove"]);
});
