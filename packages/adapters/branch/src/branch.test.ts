import { intent, Junction } from "@priemskiyyy/junction";
import { expect, test } from "vitest";
import { z } from "zod";

import { branch } from "src/branch";
import { createFakeBranch } from "src/fakeBranch.fixture";
import type { BranchOpenEventLike } from "src/types/BranchOpenEventLike";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const clicked = (
  documentId: string,
): Extract<BranchOpenEventLike, { error: null | undefined }> => ({
  params: {
    "+clicked_branch_link": true,
    "+is_first_session": false,
    "~referring_link": "https://example.app.link/abc",
    documentId,
  },
  error: null,
  uri: "https://example.app.link/abc",
});

const createJunction = (fake: ReturnType<typeof createFakeBranch>) =>
  new Junction({
    intents: {
      openDocument: intent(
        z.object({ documentId: z.string().min(1) }).strict(),
      ),
    },
    sources: { referrals: branch({ sdk: fake.sdk }) },
    routes: ({ from }) => ({
      referral: from.referrals.event({
        intent: "openDocument",
        payload: ({ params }) => ({ documentId: params.documentId }),
      }),
    }),
  });

test("creating the source subscribes to nothing", () => {
  const fake = createFakeBranch();

  createJunction(fake);

  expect(fake.calls).toEqual([]);
});

test("a clicked Branch link becomes the routed intent, its params and URI kept under Branch's names", async () => {
  const fake = createFakeBranch();
  const junction = createJunction(fake);

  await junction.start();
  fake.open(clicked("document-42"));
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      name: "openDocument",
      payload: { documentId: "document-42" },
      provenance: {
        kind: "source",
        source: { name: "referrals" },
        initial: false,
        deferred: null,
      },
    },
  ]);
  junction.dispose();
});

test("the launch link Branch caches for the app's first subscriber is admitted as a live event, since Branch has no launch read", async () => {
  const fake = createFakeBranch();
  const junction = createJunction(fake);

  fake.launch(clicked("document-42"));

  await expect(junction.start()).resolves.toMatchObject({
    sources: [{ name: "referrals", initial: "none" }],
  });
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      payload: { documentId: "document-42" },
      provenance: { source: { name: "referrals" }, initial: false },
    },
  ]);
  junction.dispose();
});

test("the cached launch link keeps Branch's own mark, beside its params and URI", async () => {
  const fake = createFakeBranch();
  const pushed: unknown[] = [];

  fake.launch(clicked("document-42"));

  branch({ sdk: fake.sdk }).attach({
    push: (observation) => {
      pushed.push(observation);

      return Promise.resolve({ status: "ignored", reason: "no-route" });
    },
    fail: () => {},
  });
  await tick();

  expect(pushed).toEqual([
    {
      input: {
        params: {
          ...clicked("document-42").params,
          "+rn_cached_initial_event": true,
        },
        uri: "https://example.app.link/abc",
      },
    },
  ]);
});

test("an open that is not a clicked Branch link produces nothing", async () => {
  const fake = createFakeBranch();
  const junction = createJunction(fake);

  await junction.start();
  fake.open({
    params: {
      "+clicked_branch_link": false,
      "+non_branch_link": "myapp://documents/42",
    },
    error: null,
    uri: "myapp://documents/42",
  });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  junction.dispose();
});

test("a Branch error is reported on the source's status and produces no intent", async () => {
  const fake = createFakeBranch();
  const junction = createJunction(fake);

  await junction.start();
  fake.open({
    params: undefined,
    error: "Trouble reaching the Branch servers.",
    uri: null,
  });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(junction.source("referrals").status.get()).toMatchObject({
    state: "attached",
    error: {
      code: "SOURCE_ERROR",
      cause: "Trouble reaching the Branch servers.",
    },
  });
  junction.dispose();
});

test("a subscriber after the app's first misses the cached launch link, so Junction has to subscribe first", async () => {
  const fake = createFakeBranch();
  const junction = createJunction(fake);

  fake.launch(clicked("document-42"));
  fake.sdk.subscribe({ onOpenComplete: () => {} });
  await junction.start();
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  junction.dispose();
});

test("dispose unsubscribes, and the source never opens a URL, reads referring params, sets an identity or changes tracking", async () => {
  const fake = createFakeBranch();
  const junction = createJunction(fake);

  await junction.start();
  await tick();
  junction.dispose();

  expect(fake.calls).toEqual(["subscribe", "unsubscribe"]);
  expect(fake.subscribers()).toBe(0);
  expect(fake.wired()).toBe(0);
});

test("a dispose before Branch finished its cached check leaves Branch's late listener behind, and nothing it delivers reaches the Junction", async () => {
  const fake = createFakeBranch();
  const junction = createJunction(fake);

  junction.start();
  junction.dispose();
  await tick();
  fake.open(clicked("document-42"));
  await tick();

  expect(fake.subscribers()).toBe(0);
  expect(fake.wired()).toBe(1);
  expect(junction.inbox.get()).toEqual([]);
});

test("a deferred Branch link, which carries no URI, is pushed with the URI null", async () => {
  const fake = createFakeBranch();
  const pushed: unknown[] = [];

  branch({ sdk: fake.sdk }).attach({
    push: (observation) => {
      pushed.push(observation);

      return Promise.resolve({ status: "ignored", reason: "no-route" });
    },
    fail: () => {},
  });
  await tick();
  fake.open({
    params: { "+clicked_branch_link": true, "+is_first_session": true },
    error: null,
    uri: null,
  });

  expect(pushed).toEqual([
    {
      input: {
        params: { "+clicked_branch_link": true, "+is_first_session": true },
        uri: null,
      },
    },
  ]);
});
