import { intent, Junction } from "@priemskiyyy/junction";
import { expect, test } from "vitest";
import { z } from "zod";

import { createFakeNotifications } from "src/fakeNotifications.fixture";
import { notifications } from "src/notifications";
import type { NotificationResponseLike } from "src/types/NotificationResponseLike";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const DEFAULT_ACTION = "expo.modules.notifications.actions.DEFAULT";

const response = (
  documentId: string,
  actionIdentifier = DEFAULT_ACTION,
): NotificationResponseLike => ({
  notification: {
    request: {
      identifier: `notification-${documentId}`,
      content: { data: { documentId }, categoryIdentifier: "documents" },
    },
  },
  actionIdentifier,
});

const createJunction = (
  fake: ReturnType<typeof createFakeNotifications>,
  options: { interaction?: "per-notification-action" } = {},
) =>
  new Junction({
    intents: {
      openDocument: intent(
        z.object({ documentId: z.string().min(1) }).strict(),
      ),
    },
    sources: { presses: notifications({ sdk: fake.sdk, ...options }) },
    routes: ({ from }) => ({
      document: from.presses.event({
        intent: "openDocument",
        match: ({ action }) => action.id === DEFAULT_ACTION,
        payload: ({ data }) => ({ documentId: data.documentId }),
      }),
    }),
  });

test("creating the source listens to nothing and reads no response", () => {
  const fake = createFakeNotifications();

  createJunction(fake);

  expect(fake.calls).toEqual([]);
});

test("a press becomes the routed intent, and a press on another action is left to its own route", async () => {
  const fake = createFakeNotifications();
  const junction = createJunction(fake);

  await junction.start();
  fake.press(response("document-42"));
  fake.press(response("document-7", "archive"));
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      payload: { documentId: "document-42" },
      provenance: {
        kind: "source",
        source: { name: "presses" },
        initial: false,
      },
    },
  ]);
  junction.dispose();
});

test("the press that launched the app is the launch read, after the listener exists", async () => {
  const fake = createFakeNotifications();
  const junction = createJunction(fake);

  fake.press(response("document-42"));

  const report = await junction.start();

  expect(report.sources).toEqual([{ name: "presses", initial: "received" }]);
  expect(fake.calls).toEqual([
    "addNotificationResponseReceivedListener",
    "getLastNotificationResponse",
  ]);
  expect(junction.inbox.get()).toMatchObject([
    { payload: { documentId: "document-42" }, provenance: { initial: true } },
  ]);
  junction.dispose();
});

test("by default, one press delivered to both the launch read and the listener is two intents", async () => {
  const fake = createFakeNotifications();
  const junction = createJunction(fake);

  fake.raceNextListener(response("document-42"));
  await junction.start();
  await tick();

  expect(junction.inbox.get()).toHaveLength(2);
  junction.dispose();
});

test("per notification action, that second delivery is a duplicate, while another action on the notification is an intent of its own", async () => {
  const fake = createFakeNotifications();
  const Document = z.object({ documentId: z.string().min(1) }).strict();

  const junction = new Junction({
    intents: {
      openDocument: intent(Document),
      archiveDocument: intent(Document),
    },
    sources: {
      presses: notifications({
        sdk: fake.sdk,
        interaction: "per-notification-action",
      }),
    },
    routes: ({ from }) => ({
      document: from.presses.event({
        intent: "openDocument",
        match: ({ action }) => action.id === DEFAULT_ACTION,
        payload: ({ data }) => ({ documentId: data.documentId }),
      }),
      archive: from.presses.event({
        intent: "archiveDocument",
        match: ({ action }) => action.id === "archive",
        payload: ({ data }) => ({ documentId: data.documentId }),
      }),
    }),
  });

  fake.raceNextListener(response("document-42"));
  await junction.start();
  await tick();
  fake.press(response("document-42", "archive"));
  await tick();

  expect(junction.inbox.get().map(({ name }) => name)).toEqual([
    "openDocument",
    "archiveDocument",
  ]);
  junction.dispose();
});

test("dispose removes the listener, and the source never clears the kept response, dismisses or badges", async () => {
  const fake = createFakeNotifications();
  const junction = createJunction(fake);

  await junction.start();
  junction.dispose();

  expect(fake.listeners()).toBe(0);
  expect(fake.calls).toEqual([
    "addNotificationResponseReceivedListener",
    "getLastNotificationResponse",
  ]);
});
