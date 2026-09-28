import { expect, test, vi } from "vitest";

import type { IntentExecution } from "src/types/IntentExecution";
import { createDeferred } from "src/utils/common/createDeferred";
import { JunctionError } from "src/utils/JunctionError";
import {
  ANNOUNCEMENT_URL,
  DOCUMENT_URL,
  createJunction,
  tick,
} from "src/utils/junction.fixture";

const getWaiting = (junction: ReturnType<typeof createJunction>["junction"]) =>
  junction.inbox.get().flatMap((entry) => {
    if (entry.state !== "pending") {
      return [];
    }

    return [entry.waiting.reason];
  });

test("an intent with no consumer waits until one registers, then runs for it", async () => {
  const { junction, links } = createJunction();
  const handler = vi.fn();

  junction.start();
  await links.emit({ input: { url: ANNOUNCEMENT_URL } });
  await tick();

  expect(getWaiting(junction)).toEqual(["no-consumer"]);

  junction.subscribe("showAnnouncement", handler);
  await tick();

  expect(handler.mock.calls).toEqual([
    [
      { announcementId: "announcement-1" },
      expect.objectContaining({ account: null }),
    ],
  ]);
  expect(junction.inbox.get()).toEqual([]);
});

test("subscribing never delivers synchronously: the handler waits for a later turn", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  junction.subscribe("showAnnouncement", handler);

  expect(handler).not.toHaveBeenCalled();
  await tick();
  expect(handler.mock.calls).toHaveLength(1);
});

test("a unique owner that is not ready holds its intent and is never invoked", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", handler, {
    ready: false,
    name: "announcements",
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(handler).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toMatchObject([
    {
      state: "pending",
      waiting: {
        reason: "consumer-not-ready",
        consumers: [{ id: expect.any(String), name: "announcements" }],
      },
    },
  ]);
});

test("a blocked primary keeps its intent: a ready fallback never steals it", async () => {
  const { junction } = createJunction();
  const primary = vi.fn();
  const fallback = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", fallback, { fallback: true });

  const owner = junction.subscribe("showAnnouncement", primary, {
    ready: false,
  });

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(fallback).not.toHaveBeenCalled();
  expect(getWaiting(junction)).toEqual(["consumer-not-ready"]);

  owner.update(primary, { ready: true });
  await tick();

  expect(primary.mock.calls).toHaveLength(1);
  expect(fallback).not.toHaveBeenCalled();
});

test("two matching primaries are ambiguous even when only one is ready, and neither runs", async () => {
  const { junction } = createJunction();
  const ready = vi.fn();
  const blocked = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", ready, { name: "ready" });
  junction.subscribe("showAnnouncement", blocked, {
    name: "blocked",
    ready: false,
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(ready).not.toHaveBeenCalled();
  expect(blocked).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toMatchObject([
    {
      state: "pending",
      waiting: {
        reason: "ambiguous-consumer",
        consumers: [{ name: "ready" }, { name: "blocked" }],
      },
    },
  ]);
});

test("a fallback runs only when no primary matches, whatever order they registered in", async () => {
  const { junction } = createJunction();
  const fallback = vi.fn();
  const other = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", fallback, { fallback: true });
  junction.subscribe("showAnnouncement", other, {
    match: ({ announcementId }) => announcementId === "other",
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(fallback.mock.calls).toHaveLength(1);
  expect(other).not.toHaveBeenCalled();
});

test("two matching fallbacks are ambiguous rather than an arbitrary choice", async () => {
  const { junction } = createJunction();
  const first = vi.fn();
  const second = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", first, { fallback: true });
  junction.subscribe("showAnnouncement", second, { fallback: true });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  expect(getWaiting(junction)).toEqual(["ambiguous-consumer"]);
});

test("a matcher or a readiness getter that throws holds the intent with the error named", async () => {
  const { junction } = createJunction();

  junction.start();
  junction.subscribe("showAnnouncement", vi.fn(), {
    match: () => {
      throw new Error("the matcher broke");
    },
  });
  junction.subscribe("openDocument", vi.fn(), {
    ready: () => {
      throw new Error("the getter broke");
    },
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  expect(getWaiting(junction)).toEqual(["selection-error", "readiness-error"]);
});

test("a consumer whose closure changed is not reevaluated until the Junction refreshes", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();
  const workspace = { id: "workspace-1" };

  junction.start();
  junction.subscribe("openDocument", handler, {
    match: ({ workspaceId }) => workspaceId === workspace.id,
  });

  await junction.dispatch("openDocument", {
    workspaceId: "workspace-7",
    documentId: "d",
  });
  await tick();

  workspace.id = "workspace-7";
  await tick();

  expect(handler).not.toHaveBeenCalled();

  junction.refresh();
  await tick();

  expect(handler.mock.calls).toHaveLength(1);
});

test("a refresh interrupts the running attempt of an owner that stopped matching, at once", async () => {
  const { junction } = createJunction();
  const held = createDeferred();
  const workspace = { id: "workspace-7" };
  const executions: IntentExecution<string, boolean>[] = [];

  junction.start();
  junction.subscribe(
    "openDocument",
    (_payload, execution) => {
      executions.push(execution);

      return held.promise;
    },
    { match: ({ workspaceId }) => workspaceId === workspace.id },
  );
  await junction.dispatch("openDocument", {
    workspaceId: "workspace-7",
    documentId: "d",
  });
  await tick();

  workspace.id = "workspace-1";
  junction.refresh();

  expect(executions[0]?.signal.aborted).toBe(true);

  held.resolve();
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    { state: "interrupted", error: { code: "OWNER_UNMATCHED" } },
  ]);
});

test("a refresh before start or after dispose does nothing and never throws", () => {
  const { junction } = createJunction();

  expect(() => junction.refresh()).not.toThrow();

  junction.dispose();

  expect(() => junction.refresh()).not.toThrow();
});

test("an update replaces the handler, matcher and readiness together, and the next run uses all three", async () => {
  const { junction } = createJunction();
  const before = vi.fn();
  const after = vi.fn();

  junction.start();

  const registration = junction.subscribe("showAnnouncement", before, {
    match: () => false,
    ready: false,
  });

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  registration.update(after, { match: () => true, ready: true });
  await tick();

  expect(before).not.toHaveBeenCalled();
  expect(after.mock.calls).toHaveLength(1);
});

test("an option an update leaves out returns to its default, as a declarative binding needs", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.start();

  const registration = junction.subscribe("showAnnouncement", handler, {
    ready: false,
    scope: "editor-1",
  });

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(getWaiting(junction)).toEqual(["consumer-not-ready"]);

  registration.update(handler);
  await tick();

  expect(handler.mock.calls).toHaveLength(1);
});

test("a consumer disposed before its turn is never invoked", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.start();

  const registration = junction.subscribe("showAnnouncement", handler);

  const admission = junction.dispatch("showAnnouncement", {
    announcementId: "a-1",
  });

  registration.dispose();
  await tick();

  await expect(admission).resolves.toMatchObject({ status: "accepted" });

  expect(handler).not.toHaveBeenCalled();
  expect(getWaiting(junction)).toEqual(["no-consumer"]);
});

test("an intent waiting for another account never blocks an eligible later one", async () => {
  const { junction, links } = createJunction();
  const openDocument = vi.fn();
  const showAnnouncement = vi.fn();

  junction.start();
  junction.subscribe("openDocument", openDocument);
  junction.subscribe("showAnnouncement", showAnnouncement);
  await links.emit({ input: { url: `${DOCUMENT_URL}?account=account-4` } });
  await links.emit({ input: { url: ANNOUNCEMENT_URL } });
  await tick();

  expect(openDocument).not.toHaveBeenCalled();
  expect(showAnnouncement.mock.calls).toHaveLength(1);
  expect(getWaiting(junction)).toEqual(["account-mismatch"]);
});

test("observing the inbox and the diagnostics changes no ownership and runs nothing", async () => {
  const { junction } = createJunction();

  junction.start();
  junction.inbox.subscribe(() => junction.inbox.get());
  junction.diagnostics.subscribe(() => junction.diagnostics.get());
  junction.diagnostics.events.subscribe(() => {});
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(getWaiting(junction)).toEqual(["no-consumer"]);
  expect(junction.diagnostics.get().consumers).toEqual([]);
});

test("a consumer registered before start waits inertly, and runs once the Junction starts", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.subscribe("showAnnouncement", handler);
  await tick();

  junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(handler.mock.calls).toHaveLength(1);
});

test("an update on a disposed registration is misconfiguration, and disposing twice is harmless", () => {
  const { junction } = createJunction();
  const registration = junction.subscribe("showAnnouncement", vi.fn());

  registration.dispose();

  expect(() => registration.dispose()).not.toThrow();
  expect(() => registration.update(vi.fn(), { ready: false })).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message: "The registration was disposed; subscribe again for a new one.",
    }),
  );
});

test("a consumer of an undeclared intent is misconfiguration", () => {
  const { junction } = createJunction();

  // @ts-expect-error The Junction declares no openSettings intent.
  expect(() => junction.subscribe("openSettings", () => {})).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message: 'The Junction declares no intent named "openSettings".',
    }),
  );
});

test("a consumer renamed while its intent waits shows its new name in the waiting entry", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.start();

  const registration = junction.subscribe("showAnnouncement", handler, {
    name: "Old screen",
    ready: false,
  });

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();
  registration.update(handler, { name: "New screen", ready: false });
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      waiting: {
        reason: "consumer-not-ready",
        consumers: [{ id: registration.id, name: "New screen" }],
      },
    },
  ]);
});
