import { expect, test } from "vitest";
import { z } from "zod";

import { createMockSource } from "src/mock/createMockSource";
import type { SourceObservation } from "src/types/SourceObservation";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";
import { JunctionError } from "src/utils/JunctionError";
import {
  ANNOUNCEMENT_URL,
  DOCUMENT_URL,
  createJunction,
  tick,
} from "src/utils/junction.fixture";

type Interaction = NonNullable<SourceObservation<unknown>["interaction"]>;

test("a dispatch before start is refused as not started, and one after dispose as disposed", async () => {
  const { junction } = createJunction();

  await expect(
    junction.dispatch("showAnnouncement", { announcementId: "a-1" }),
  ).resolves.toMatchObject({ status: "rejected", reason: "not-started" });

  junction.dispose();

  await expect(
    junction.dispatch("showAnnouncement", { announcementId: "a-1" }),
  ).resolves.toMatchObject({ status: "rejected", reason: "disposed" });
});

test("a routed URL becomes an accepted intent that waits in the inbox for its consumer", async () => {
  const { junction, links } = createJunction();

  junction.start();

  const admission = await links.emit({
    input: { url: `${DOCUMENT_URL}?account=account-3` },
  });

  expect(admission).toEqual({
    status: "accepted",
    intent: { id: expect.any(String) },
    durability: "memory",
  });

  await tick();

  expect(junction.inbox.get()).toEqual([
    {
      id: admission.status === "accepted" ? admission.intent.id : "",
      name: "openDocument",
      payload: {
        workspaceId: "workspace-7",
        documentId: "document-42",
        accountId: "account-3",
      },
      attempts: 0,
      binding: { kind: "bound", account: { id: "account-3" } },
      timestamp: expect.any(Number),
      expires: { at: expect.any(Number) },
      provenance: {
        kind: "source",
        source: { name: "links" },
        route: { id: "documentUrl" },
        initial: false,
        deferred: null,
      },
      state: "pending",
      waiting: { reason: "no-consumer", consumers: [] },
    },
  ]);
});

test("the same URL twice without occurrence evidence is two intents: a repeated tap is never mistaken for a duplicate", async () => {
  const { junction, links } = createJunction();

  junction.start();

  const first = await links.emit({ input: { url: ANNOUNCEMENT_URL } });
  const second = await links.emit({ input: { url: ANNOUNCEMENT_URL } });

  expect(first).toMatchObject({ status: "accepted" });
  expect(second).toMatchObject({ status: "accepted" });
  expect(first).not.toEqual(second);
  await tick();
  expect(junction.inbox.get()).toHaveLength(2);
});

test("the same occurrence key with the same payload is one intent, before and after it is acknowledged", async () => {
  const { junction, links } = createJunction();

  junction.start();

  const press: Interaction = { key: "press-1", scope: "installation" };

  const first = await links.emit({
    input: { url: ANNOUNCEMENT_URL },
    interaction: press,
  });

  const replay = await links.emit({
    input: { url: ANNOUNCEMENT_URL },
    interaction: press,
  });

  expect(replay).toEqual({
    status: "duplicate",
    intent: first.status === "accepted" ? first.intent : { id: "" },
    durability: "memory",
  });

  junction.subscribe("showAnnouncement", () => {});
  await tick();
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  await expect(
    links.emit({ input: { url: ANNOUNCEMENT_URL }, interaction: press }),
  ).resolves.toEqual(replay);
});

test("an occurrence key settled a day ago is forgotten even when nothing else settles, so the next press with that id is a new intent", async () => {
  let now = 0;

  const { junction, links } = createJunction({ now: () => now });

  junction.start();
  junction.subscribe("showAnnouncement", () => {});

  const press: Interaction = { key: "press-1", scope: "installation" };

  await links.emit({ input: { url: ANNOUNCEMENT_URL }, interaction: press });
  await tick();
  now = 86_400_000;

  await expect(
    links.emit({ input: { url: ANNOUNCEMENT_URL }, interaction: press }),
  ).resolves.toMatchObject({ status: "accepted" });
});

test("the same occurrence key with another payload is a conflict, and nothing runs or is replaced", async () => {
  const { junction, links } = createJunction();

  junction.start();

  const press: Interaction = { key: "press-1", scope: "installation" };

  await links.emit({ input: { url: ANNOUNCEMENT_URL }, interaction: press });

  await expect(
    links.emit({
      input: { url: "myapp://announcements/another" },
      interaction: press,
    }),
  ).resolves.toMatchObject({
    status: "rejected",
    reason: "interaction-conflict",
    retryable: false,
  });
  await tick();
  expect(junction.inbox.get().map(({ payload }) => payload)).toEqual([
    { announcementId: "announcement-1" },
  ]);
});

test("the same occurrence key from two sources is two occurrences: keys are namespaced by source", async () => {
  const first = createMockSource<{ url: string }>();
  const second = createMockSource<{ url: string }>();

  const junction = new Junction({
    intents: {
      showAnnouncement: intent(z.object({ announcementId: z.string() })),
    },
    sources: { first: first.source, second: second.source },
    routes: ({ from }) => ({
      fromFirst: from.first.event({
        intent: "showAnnouncement",
        payload: () => ({ announcementId: "a-1" }),
      }),
      fromSecond: from.second.event({
        intent: "showAnnouncement",
        payload: () => ({ announcementId: "a-1" }),
      }),
    }),
  });

  junction.start();

  const press: Interaction = { key: "notification-9", scope: "installation" };

  await expect(
    first.control.emit({ input: { url: "" }, interaction: press }),
  ).resolves.toMatchObject({ status: "accepted" });
  await expect(
    second.control.emit({ input: { url: "" }, interaction: press }),
  ).resolves.toMatchObject({ status: "accepted" });
});

test("a dispatch interaction key deduplicates dispatches, and never collides with a source's key", async () => {
  const { junction, links } = createJunction();

  junction.start();

  const interaction = { key: "share-sheet:9f2c" };

  const first = await junction.dispatch(
    "showAnnouncement",
    { announcementId: "announcement-1" },
    { interaction },
  );

  await expect(
    junction.dispatch(
      "showAnnouncement",
      { announcementId: "announcement-1" },
      { interaction },
    ),
  ).resolves.toEqual({
    status: "duplicate",
    intent: first.status === "accepted" ? first.intent : { id: "" },
    durability: "memory",
  });
  await expect(
    links.emit({
      input: { url: ANNOUNCEMENT_URL },
      interaction: { key: "share-sheet:9f2c", scope: "installation" },
    }),
  ).resolves.toMatchObject({ status: "accepted" });
});

test("an interaction key outside 1 to 160 characters is refused", async () => {
  const { junction, links } = createJunction();

  junction.start();

  await expect(
    links.emit({
      input: { url: ANNOUNCEMENT_URL },
      interaction: { key: "", scope: "runtime" },
    }),
  ).resolves.toMatchObject({ status: "rejected", reason: "invalid-input" });
  await expect(
    junction.dispatch(
      "showAnnouncement",
      { announcementId: "a-1" },
      { interaction: { key: "k".repeat(161) } },
    ),
  ).resolves.toMatchObject({ status: "rejected", reason: "invalid-input" });
});

test("two inputs that normalize to one payload are still two intents: payloads are never compared to deduplicate", async () => {
  const { junction, links } = createJunction();

  junction.start();

  await links.emit({ input: { url: `${DOCUMENT_URL}?utm=a` } });
  await links.emit({ input: { url: `${DOCUMENT_URL}?utm=b` } });
  await tick();

  expect(junction.inbox.get().map(({ payload }) => payload)).toEqual([
    { workspaceId: "workspace-7", documentId: "document-42" },
    { workspaceId: "workspace-7", documentId: "document-42" },
  ]);
});

test("a payload the schema refuses never becomes an intent, whoever sends it", async () => {
  const { junction, links } = createJunction();

  junction.start();

  await expect(
    junction.dispatch("showAnnouncement", {
      announcementId: "",
    }),
  ).resolves.toMatchObject({
    status: "rejected",
    reason: "invalid-payload",
    issues: [{ path: "announcementId" }],
  });
  await expect(
    // @ts-expect-error JavaScript callers get the same validation the types would give.
    junction.dispatch("showAnnouncement", { announcementId: 42 }),
  ).resolves.toMatchObject({ status: "rejected", reason: "invalid-payload" });
  await expect(
    links.emit({ input: { url: "myapp://announcements/a?x=1" } }),
  ).resolves.toMatchObject({ status: "accepted" });
  await tick();
  expect(junction.inbox.get()).toHaveLength(1);
});

test("an undeclared intent name, which only JavaScript can pass, is misconfiguration", () => {
  const { junction } = createJunction();

  junction.start();

  // @ts-expect-error The Junction declares no openSettings intent.
  expect(() => junction.dispatch("openSettings", {})).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message: 'The Junction declares no intent named "openSettings".',
    }),
  );
});

test("an observation no route matches, or whose origin another source owns, is ignored", async () => {
  const links = createMockSource<{ url: string }>();
  const referrals = createMockSource<{ url: string }>();

  const junction = new Junction({
    intents: {
      showAnnouncement: intent(z.object({ announcementId: z.string() })),
    },
    sources: { links: links.source, referrals: referrals.source },
    routes: ({ from }) => ({
      referral: from.referrals.url({
        url: "https://go.example.com/:code",
        intent: "showAnnouncement",
        payload: ({ params }) => ({ announcementId: params.code }),
      }),
    }),
  });

  junction.start();

  await expect(
    links.control.emit({ input: { url: "https://go.example.com/abc" } }),
  ).resolves.toEqual({ status: "ignored", reason: "owned-by-other-source" });
  await expect(
    links.control.emit({ input: { url: "https://elsewhere.example.com/abc" } }),
  ).resolves.toEqual({ status: "ignored", reason: "no-route" });
  await expect(
    referrals.control.emit({ input: { url: "https://go.example.com/abc" } }),
  ).resolves.toMatchObject({ status: "accepted" });
});

test("the inbox refuses a 33rd intent, retryably, and never evicts accepted work", async () => {
  const { junction } = createJunction();

  junction.start();

  for (let index = 0; index < 32; index += 1) {
    await expect(
      junction.dispatch("showAnnouncement", { announcementId: `a-${index}` }),
    ).resolves.toMatchObject({ status: "accepted" });
  }

  await expect(
    junction.dispatch("showAnnouncement", { announcementId: "a-32" }),
  ).resolves.toMatchObject({
    status: "rejected",
    reason: "inbox-full",
    retryable: true,
  });
  await tick();
  expect(junction.inbox.get()).toHaveLength(32);
});

test("inspect explains what an input would become and admits nothing, even before start", () => {
  const { junction, links } = createJunction();

  expect(
    junction.inspect("links", { url: `${DOCUMENT_URL}?account=account-3` }),
  ).toEqual({
    status: "matched",
    route: { id: "documentUrl" },
    intent: {
      name: "openDocument",
      payload: {
        workspaceId: "workspace-7",
        documentId: "document-42",
        accountId: "account-3",
      },
    },
  });
  expect(
    junction.inspect("links", { url: "https://app.example.com/settings" }),
  ).toEqual({
    status: "ignored",
    reason: "no-route",
  });
  expect(
    junction.inspect("links", { url: `${DOCUMENT_URL}?account=a&account=b` }),
  ).toMatchObject({
    status: "rejected",
    reason: "route-failed",
  });
  expect(links.attachments).toEqual([]);
  expect(junction.inbox.get()).toEqual([]);
});

test("an inspection is frozen, the issues of a refusal included", () => {
  const { junction } = createJunction();

  const inspection = junction.inspect("links", {
    url: `${DOCUMENT_URL}?account=a&account=b`,
  });

  const issues = inspection.status === "rejected" ? inspection.issues : [];

  expect(issues).toHaveLength(1);
  expect(Object.isFrozen(inspection)).toBe(true);
  expect(Object.isFrozen(issues)).toBe(true);
  expect(issues.every(Object.isFrozen)).toBe(true);
});
