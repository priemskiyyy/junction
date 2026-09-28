import { expect, test, vi } from "vitest";

import { createDeferred } from "src/utils/common/createDeferred";
import { JunctionError } from "src/utils/JunctionError";
import { createJunction, tick } from "src/utils/junction.fixture";

const dispatch = async (
  junction: ReturnType<typeof createJunction>["junction"],
  announcementId = "a-1",
) => {
  const admission = await junction.dispatch("showAnnouncement", {
    announcementId,
  });

  if (admission.status !== "accepted") {
    throw new Error(`Expected an accepted intent, got ${admission.status}.`);
  }

  return admission.intent.id;
};

test("a failed intent retried keeps its id and payload and runs again as a new attempt", async () => {
  const { junction } = createJunction();
  const attempts: { intent: string; attempt: string; number: number }[] = [];

  junction.start();
  junction.subscribe("showAnnouncement", (_payload, { intent, attempt }) => {
    attempts.push({
      intent: intent.id,
      attempt: attempt.id,
      number: attempt.number,
    });

    if (attempt.number === 1) {
      throw new Error("the API is down");
    }
  });

  const id = await dispatch(junction);

  await tick();

  expect(junction.inbox.get()).toMatchObject([{ id, state: "failed" }]);
  await expect(junction.retry(id)).resolves.toEqual({ status: "applied" });
  await tick();

  expect(attempts.map(({ intent, number }) => [intent, number])).toEqual([
    [id, 1],
    [id, 2],
  ]);
  expect(attempts[0]?.attempt).not.toBe(attempts[1]?.attempt);
  expect(junction.inbox.get()).toEqual([]);
});

test("an interrupted intent can be retried: the application decides about an effect that may have happened", async () => {
  const { junction } = createJunction();
  const held = createDeferred();
  const handler = vi.fn(() => held.promise);

  junction.start();

  const registration = junction.subscribe("showAnnouncement", handler, {
    scope: "editor-1",
  });

  const id = await dispatch(junction);

  await tick();
  registration.update(handler, { scope: "editor-2" });
  held.resolve();
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    { state: "interrupted", error: { code: "SCOPE_CHANGED" } },
  ]);
  await expect(junction.retry(id)).resolves.toEqual({ status: "applied" });
  await tick();

  expect(handler.mock.calls).toHaveLength(2);
});

test("cancel ends a waiting intent, and a running one only once its handler settled", async () => {
  const { junction } = createJunction();
  const held = createDeferred();
  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type, context }) =>
    events.push(`${type} ${JSON.stringify(context)}`),
  );
  junction.start();

  const waiting = await dispatch(junction, "waiting");

  await tick();
  await expect(junction.cancel(waiting)).resolves.toEqual({
    status: "applied",
  });

  junction.subscribe("showAnnouncement", () => held.promise);

  const running = await dispatch(junction, "running");

  await tick();
  await expect(junction.cancel(running)).resolves.toEqual({
    status: "requested",
  });

  expect(junction.inbox.get()).toMatchObject([
    { id: running, state: "leased" },
  ]);

  held.resolve();
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(events).toContain('intent cancelled {"running":false}');
  expect(events).toContain('intent cancelled {"running":true}');
});

test("a cancel of a running attempt that was already interrupted still ends the intent cancelled once its handler settles", async () => {
  const { junction } = createJunction();
  const held = createDeferred();
  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type }) => events.push(type));
  junction.start();

  const handler = () => held.promise;

  const registration = junction.subscribe("showAnnouncement", handler, {
    scope: "editor-1",
  });

  const id = await dispatch(junction);

  await tick();
  registration.update(handler, { scope: "editor-2" });
  await expect(junction.cancel(id)).resolves.toEqual({ status: "requested" });
  held.resolve();
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(events).toContain("intent cancelled");
  expect(events).not.toContain("intent interrupted");
});

test("a cancel that arrives after the effect was committed cannot undo it: the intent is acknowledged", async () => {
  const { junction } = createJunction();
  const held = createDeferred();
  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type }) => events.push(type));
  junction.start();
  junction.subscribe("showAnnouncement", async (_payload, { commit }) => {
    commit(() => {});
    await held.promise;
  });

  const id = await dispatch(junction);

  await tick();
  await junction.cancel(id);
  held.resolve();
  await tick();

  expect(events).toContain("intent acknowledged");
  expect(events).not.toContain("intent cancelled");
});

test("recovery answers why it refuses, and never revives an ended intent", async () => {
  const { junction } = createJunction();

  await expect(junction.retry("unknown")).resolves.toEqual({
    status: "refused",
    reason: "not-started",
  });

  junction.start();

  const pending = await dispatch(junction, "pending");

  await tick();

  await expect(junction.retry("unknown")).resolves.toEqual({
    status: "refused",
    reason: "unknown",
  });
  await expect(junction.retry(pending)).resolves.toEqual({
    status: "refused",
    reason: "not-recoverable",
  });

  junction.subscribe("showAnnouncement", () => {});
  await tick();

  await expect(junction.retry(pending)).resolves.toEqual({
    status: "refused",
    reason: "unknown",
  });

  junction.dispose();

  await expect(junction.cancel(pending)).resolves.toEqual({
    status: "refused",
    reason: "disposed",
  });
});

test("a retry of an intent that used all its attempts is refused", async () => {
  const { junction } = createJunction();

  junction.start();
  junction.subscribe("showAnnouncement", () => {
    throw new Error("always");
  });

  const id = await dispatch(junction);

  await tick();

  for (const expected of ["applied", "applied"]) {
    await expect(junction.retry(id)).resolves.toEqual({ status: expected });
    await tick();
  }

  await expect(junction.retry(id)).resolves.toEqual({
    status: "refused",
    reason: "attempts-exhausted",
  });
});

test("a retry delay that is not a whole number of milliseconds is misconfiguration", async () => {
  const { junction } = createJunction();

  junction.start();

  expect(() => junction.retry("any", { after: -1 })).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message:
        "after must be a whole number of milliseconds from 0 to 2147483647.",
    }),
  );
});
