import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";

import { createMockStorage } from "src/mock/createMockStorage";
import type { InboxEntry } from "src/types/InboxEntry";
import type { IntentExecution } from "src/types/IntentExecution";
import type { ObservableValue } from "src/types/ObservableValue";
import { createDeferred } from "src/utils/common/createDeferred";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";
import { JunctionError } from "src/utils/JunctionError";
import {
  DOCUMENT_URL,
  authenticated,
  createIdentity,
  createJunction,
  intents,
  tick,
} from "src/utils/junction.fixture";

afterEach(() => {
  vi.useRealTimers();
});

const getWaiting = (junction: {
  inbox: ObservableValue<InboxEntry<string, unknown>[]>;
}) =>
  junction.inbox.get().flatMap((entry) => {
    if (entry.state !== "pending") {
      return [];
    }

    return [entry.waiting.reason];
  });

test("an account-bound intent waits while the identity restores or nobody is signed in, and a public one runs", async () => {
  const { junction, identity } = createJunction({
    identity: { status: "restoring" },
  });

  const openDocument = vi.fn();
  const showAnnouncement = vi.fn();

  junction.start();
  junction.subscribe("openDocument", openDocument);
  junction.subscribe("showAnnouncement", showAnnouncement);
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(getWaiting(junction)).toEqual(["identity-restoring"]);
  expect(showAnnouncement.mock.calls).toHaveLength(1);

  identity.set({ status: "anonymous" });
  await tick();

  expect(getWaiting(junction)).toEqual(["authentication"]);
  expect(openDocument).not.toHaveBeenCalled();

  identity.set(authenticated("account-3"));
  await tick();

  expect(openDocument.mock.calls).toEqual([
    [
      { workspaceId: "w", documentId: "d" },
      expect.objectContaining({ account: { id: "account-3" } }),
    ],
  ]);
});

test("a link for account B while A is signed in waits: Junction never switches accounts", async () => {
  const { junction, links, identity } = createJunction();
  const handler = vi.fn();

  junction.start();
  junction.subscribe("openDocument", handler);
  await links.emit({ input: { url: `${DOCUMENT_URL}?account=account-4` } });
  await tick();

  expect(getWaiting(junction)).toEqual(["account-mismatch"]);
  expect(junction.inbox.get()).toMatchObject([
    { binding: { kind: "bound", account: { id: "account-4" } } },
  ]);
  expect(handler).not.toHaveBeenCalled();

  identity.set(authenticated("account-4"));
  await tick();

  expect(handler.mock.calls).toHaveLength(1);
});

test("an account id outside 1 to 160 characters refuses the intent, so a link with an empty one never binds to nobody", async () => {
  const { junction, links } = createJunction();

  junction.start();

  await expect(
    links.emit({ input: { url: `${DOCUMENT_URL}?account=` } }),
  ).resolves.toEqual({
    status: "rejected",
    reason: "invalid-payload",
    retryable: false,
    issues: [
      {
        path: "",
        message: "An account id is a string of 1 to 160 characters.",
      },
    ],
  });
  await expect(
    junction.dispatch("openDocument", {
      workspaceId: "w",
      documentId: "d",
      accountId: "a".repeat(161),
    }),
  ).resolves.toMatchObject({ status: "rejected", reason: "invalid-payload" });
  expect(junction.inbox.get()).toEqual([]);
});

test("an account selector that answers something other than a string refuses the intent, and one that answers null never throws", async () => {
  const junction = new Junction({
    intents: {
      openAccount: intent(z.object({ accountId: z.number().nullable() }), {
        // @ts-expect-error A JavaScript selector can answer anything.
        account: ({ accountId }) => accountId,
      }),
    },
    identity: createIdentity(authenticated("a")).identity,
  });

  junction.start();

  await expect(
    junction.dispatch("openAccount", { accountId: 4711 }),
  ).resolves.toEqual({
    status: "rejected",
    reason: "invalid-payload",
    retryable: false,
    issues: [
      {
        path: "",
        message: "An account id is a string of 1 to 160 characters.",
      },
    ],
  });
  await expect(
    junction.dispatch("openAccount", { accountId: null }),
  ).resolves.toMatchObject({ status: "rejected", reason: "invalid-payload" });
});

test("an untargeted intent accepted while signed out binds once, at its first attempt, and a retry keeps that account", async () => {
  vi.useFakeTimers();

  const { junction, identity } = createJunction({
    identity: { status: "anonymous" },
  });

  const accounts: string[] = [];

  junction.start();
  junction.subscribe("openDocument", (_payload, { account, retry }) => {
    accounts.push(account.id);

    return retry({ after: 1_000 });
  });
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await vi.advanceTimersByTimeAsync(0);

  expect(junction.inbox.get()).toMatchObject([
    { binding: { kind: "unbound" } },
  ]);

  identity.set(authenticated("account-3"));
  await vi.advanceTimersByTimeAsync(0);

  identity.set(authenticated("account-4"));
  await vi.advanceTimersByTimeAsync(1_000);

  expect(accounts).toEqual(["account-3"]);
  expect(junction.inbox.get()).toMatchObject([
    {
      binding: { kind: "bound", account: { id: "account-3" } },
      state: "pending",
      waiting: { reason: "account-mismatch" },
    },
  ]);
});

test("an untargeted intent accepted while signed in binds to that account at once", async () => {
  const { junction } = createJunction();

  junction.start();
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    { binding: { kind: "bound", account: { id: "account-3" } } },
  ]);
});

test("A then B then A invalidates the attempt that started under the first A, although the account is the same again", async () => {
  const { junction, identity } = createJunction();
  const response = createDeferred();
  const navigate = vi.fn();

  junction.start();
  junction.subscribe("openDocument", async (_payload, { commit }) => {
    await response.promise;

    return commit(navigate);
  });
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  identity.set(authenticated("account-4"));
  identity.set(authenticated("account-3"));
  response.resolve();
  await tick();

  expect(navigate).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toMatchObject([
    { state: "interrupted", error: { code: "IDENTITY_CHANGED" } },
  ]);
});

test("the guard fails the moment the identity store changes, before anything renders again", async () => {
  const { junction, identity } = createJunction();
  const held = createDeferred();
  const executions: IntentExecution<string, boolean>[] = [];

  junction.start();
  junction.subscribe("openDocument", (_payload, execution) => {
    executions.push(execution);

    return held.promise;
  });
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  expect(() => executions[0]?.assertCurrent()).not.toThrow();

  identity.set({ status: "anonymous" });

  expect(executions[0]?.signal.aborted).toBe(true);
  expect(() => executions[0]?.assertCurrent()).toThrow(
    new JunctionError({
      code: "STALE_EXECUTION",
      message:
        "The attempt is no longer current. The identity changed while the attempt ran.",
    }),
  );
  held.resolve();
});

test("the execution's account is the one the attempt started under, whatever happens next", async () => {
  const { junction, identity } = createJunction();
  const held = createDeferred();
  const executions: IntentExecution<string, boolean>[] = [];

  junction.start();
  junction.subscribe("openDocument", (_payload, execution) => {
    executions.push(execution);

    return held.promise;
  });
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  identity.set(authenticated("account-4"));

  expect(executions[0]?.account).toEqual({ id: "account-3" });
  held.resolve();
});

test("an identity store that throws reads as restoring, so account-bound intents wait", async () => {
  const junction = new Junction({
    intents,
    identity: {
      get: () => {
        throw new Error("the store broke");
      },
      subscribe: () => () => {},
    },
  });

  junction.start();
  junction.subscribe("openDocument", vi.fn());
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  expect(getWaiting(junction)).toEqual(["identity-restoring"]);
});

test("an identity whose account id is not a string reads as restoring, so no binding is stored that a restore could not read", async () => {
  const junction = new Junction({
    intents,
    identity: {
      get: () => ({
        status: "authenticated",
        // @ts-expect-error A JavaScript identity store can hold a numeric id.
        account: { id: 4711 },
      }),
      subscribe: () => () => {},
    },
  });

  junction.start();
  junction.subscribe("openDocument", vi.fn());
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    { binding: { kind: "unbound" }, waiting: { reason: "identity-restoring" } },
  ]);
});

test("an untargeted intent whose first lease was undone before its handler ran binds again at its next attempt", async () => {
  const OpenDocument = z.object({ documentId: z.string() }).strict();
  const storage = createMockStorage();
  const store = createIdentity({ status: "anonymous" });
  const handled: string[] = [];

  const junction = new Junction({
    intents: {
      openDocument: intent(OpenDocument, {
        account: true,
        persist: { schema: OpenDocument },
      }),
    },
    identity: store.identity,
    storage: storage.storage,
  });

  await junction.start();
  junction.subscribe("openDocument", (_payload, { account }) => {
    handled.push(account.id);
  });
  await junction.dispatch("openDocument", { documentId: "d" });
  storage.control.hold();
  store.set(authenticated("ada"));
  await tick();
  store.set({ status: "anonymous" });
  store.set(authenticated("grace"));
  storage.control.release();
  await tick();
  await tick();

  expect(handled).toEqual(["grace"]);
});

test("an identity store whose unsubscribe throws is contained when the Junction is disposed", async () => {
  const junction = new Junction({
    intents,
    identity: {
      get: () => ({ status: "anonymous" }),
      subscribe: () => () => {
        throw new Error("unsubscribe threw");
      },
    },
  });

  await junction.start();

  expect(() => junction.dispose()).not.toThrow();
  await tick();
});
