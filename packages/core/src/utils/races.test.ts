import { expect, test, vi } from "vitest";
import { z } from "zod";

import { createDeferred } from "src/utils/common/createDeferred";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";
import {
  ANNOUNCEMENT_URL,
  createJunction,
  tick,
} from "src/utils/junction.fixture";

test("an inbox listener that dispatches while being notified sees committed state and its intent is admitted", async () => {
  const { junction } = createJunction();
  const seen: number[] = [];

  junction.start();
  junction.inbox.subscribe(() => {
    seen.push(junction.inbox.get().length);

    if (junction.inbox.get().length === 1) {
      junction.dispatch("showAnnouncement", {
        announcementId: "from-listener",
      });
    }
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(seen).toEqual([1, 2]);
  expect(junction.inbox.get().map(({ payload }) => payload)).toEqual([
    { announcementId: "a-1" },
    { announcementId: "from-listener" },
  ]);
});

test("a handler that disposes the Junction while it runs settles nothing and throws nothing", async () => {
  const { junction } = createJunction();
  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type }) => events.push(type));
  junction.start();
  junction.subscribe("showAnnouncement", () => {
    junction.dispose();
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(events.at(-1)).toBe("junction disposed");
  expect(events).not.toContain("intent acknowledged");
});

test("a handler that signs the user out invalidates its own attempt before it can commit", async () => {
  const { junction, identity } = createJunction();
  const navigate = vi.fn();

  junction.start();
  junction.subscribe("openDocument", (_payload, { commit }) => {
    identity.set({ status: "anonymous" });

    try {
      commit(navigate);
    } catch {
      return;
    }
  });
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  expect(navigate).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toMatchObject([
    { state: "interrupted", error: { code: "IDENTITY_CHANGED" } },
  ]);
});

test("a consumer disposed and registered again in the same turn, as Strict Mode does, runs the intent once", async () => {
  const { junction, links } = createJunction();
  const handler = vi.fn();

  junction.start();
  await links.emit({ input: { url: ANNOUNCEMENT_URL } });
  await tick();

  const first = junction.subscribe("showAnnouncement", handler);

  first.dispose();
  junction.subscribe("showAnnouncement", handler);
  await tick();

  expect(handler.mock.calls).toHaveLength(1);
});

test("a source that pushes from inside its own admission's listener is admitted in order", async () => {
  const { junction, links } = createJunction();

  let pushed = false;

  junction.start();
  junction.diagnostics.events.subscribe(({ type }) => {
    if (type !== "intent accepted" || pushed) {
      return;
    }

    pushed = true;
    links.emit({ input: { url: "myapp://announcements/second" } });
  });
  await links.emit({ input: { url: "myapp://announcements/first" } });
  await tick();

  expect(junction.inbox.get().map(({ payload }) => payload)).toEqual([
    { announcementId: "first" },
    { announcementId: "second" },
  ]);
});

test("an attempt the scope change invalidated never settles the retry that replaced it", async () => {
  const { junction } = createJunction();
  const first = createDeferred();
  const second = createDeferred();
  const deferreds = [first, second];
  const settled: string[] = [];

  junction.start();

  const handleAnnouncement = async (
    _payload: unknown,
    { attempt }: { attempt: { number: number } },
  ) => {
    await deferreds[attempt.number - 1]?.promise;
    settled.push(`attempt ${attempt.number}`);
  };

  const registration = junction.subscribe(
    "showAnnouncement",
    handleAnnouncement,
    { scope: "a" },
  );

  const admission = await junction.dispatch("showAnnouncement", {
    announcementId: "a-1",
  });

  const id = admission.status === "accepted" ? admission.intent.id : "";

  await tick();
  registration.update(handleAnnouncement, { scope: "b" });
  first.resolve();
  await tick();

  expect(junction.inbox.get()).toMatchObject([{ state: "interrupted" }]);
  await junction.retry(id);
  await tick();
  second.resolve();
  await tick();

  expect(settled).toEqual(["attempt 1", "attempt 2"]);
  expect(junction.inbox.get()).toEqual([]);
});

test("an event listener that cancels the intent a turn chose keeps its handler from running, and the next intent runs", async () => {
  const { junction } = createJunction();
  const handled: string[] = [];
  const accepted: string[] = [];

  junction.start();
  junction.subscribe("showAnnouncement", ({ announcementId }) => {
    handled.push(announcementId);
  });
  junction.diagnostics.events.subscribe(({ type, intent }) => {
    if (type === "intent accepted" && intent !== null) {
      accepted.push(intent.id);
    }

    if (type === "intent waiting") {
      junction.cancel(accepted[0] ?? "");
    }
  });
  junction.dispatch("showAnnouncement", { announcementId: "first" });
  junction.dispatch("showAnnouncement", { announcementId: "second" });
  await tick();

  expect(handled).toEqual(["second"]);
  expect(junction.inbox.get()).toEqual([]);
});

test("an inbox listener that cancels the intent it sees leased keeps its handler from running", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", handler);
  junction.inbox.subscribe(() => {
    const [entry] = junction.inbox.get();

    if (entry?.state === "leased") {
      junction.cancel(entry.id);
    }
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(handler).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toEqual([]);
});

test("an inbox listener that disposes the Junction when it sees an intent leased runs no handler", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", handler);
  junction.inbox.subscribe(() => {
    if (junction.inbox.get()[0]?.state === "leased") {
      junction.dispose();
    }
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(handler).not.toHaveBeenCalled();
});

test("an event listener that disposes the Junction during a turn runs no handler and leaves the inbox as it was", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", handler);
  junction.diagnostics.events.subscribe(({ type }) => {
    if (type === "intent waiting") {
      junction.dispose();
    }
  });
  junction.dispatch("showAnnouncement", { announcementId: "first" });
  junction.dispatch("showAnnouncement", { announcementId: "second" });
  await tick();

  expect(handler).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toEqual([]);
});

test("a match that cancels the intent when the lease is checked again before the handler keeps the handler from running", async () => {
  const junction = new Junction({
    intents: { open: intent(z.object({})) },
  });

  const handler = vi.fn();

  let intentId = "";
  let calls = 0;

  junction.diagnostics.events.subscribe((event) => {
    if (event.type === "intent accepted" && event.intent !== null) {
      intentId = event.intent.id;
    }
  });
  junction.start();
  junction.subscribe("open", handler);
  junction.subscribe("open", vi.fn(), {
    match: () => {
      calls += 1;

      if (calls === 2) {
        junction.cancel(intentId);
      }

      return false;
    },
  });
  await junction.dispatch("open", {});
  await tick();

  expect(calls).toBe(2);
  expect(handler).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toEqual([]);
});

test("an intent a listener retries in the middle of a turn never drops out of the published inbox", async () => {
  const junction = new Junction({
    intents: { flaky: intent(z.object({})), other: intent(z.object({})) },
  });

  const published: string[][] = [];

  let failedId = "";
  let armed = false;

  junction.start();
  junction.subscribe("flaky", () => {
    if (failedId === "") {
      throw new Error("The first attempt fails.");
    }
  });
  junction.inbox.subscribe(() =>
    published.push(
      junction.inbox.get().map(({ name, state }) => `${name}:${state}`),
    ),
  );
  junction.diagnostics.events.subscribe((event) => {
    if (event.type === "intent failed" && event.intent !== null) {
      failedId = event.intent.id;
    }

    if (armed && event.type === "intent waiting") {
      armed = false;
      junction.retry(failedId);
    }
  });
  await junction.dispatch("flaky", {});
  await tick();
  published.splice(0);
  armed = true;
  await junction.dispatch("other", {});
  await tick();

  expect(published).toEqual([
    ["flaky:failed", "other:pending"],
    ["flaky:leased", "other:pending"],
    ["other:pending"],
  ]);
});
