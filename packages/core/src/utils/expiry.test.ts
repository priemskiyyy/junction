import { afterEach, expect, test, vi } from "vitest";

import { createDeferred } from "src/utils/common/createDeferred";
import { createJunction } from "src/utils/junction.fixture";

afterEach(() => {
  vi.useRealTimers();
});

const start = () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);

  const created = createJunction();
  const events: string[] = [];

  created.junction.diagnostics.events.subscribe(({ type, context }) =>
    events.push(`${type} ${JSON.stringify(context)}`),
  );
  created.junction.start();

  return { ...created, events };
};

test("an intent nobody takes expires at its deadline and leaves the inbox", async () => {
  const { junction, events } = start();

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(599_999);

  expect(junction.inbox.get()).toHaveLength(1);

  await vi.advanceTimersByTimeAsync(1);

  expect(junction.inbox.get()).toEqual([]);
  expect(events).toContain('intent expired {"running":false}');
});

test("a consumer that mounts after the deadline never sees the intent", async () => {
  const { junction } = start();
  const handler = vi.fn();

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(600_000);
  junction.subscribe("showAnnouncement", handler);
  await vi.advanceTimersByTimeAsync(0);

  expect(handler).not.toHaveBeenCalled();
});

test("a retry keeps the original deadline, and one that cannot start before it ends the intent as expired", async () => {
  const { junction, events } = start();
  const attempts: number[] = [];

  junction.subscribe(
    "showAnnouncement",
    (_payload, { attempt, expires, retry }) => {
      attempts.push(attempt.number);

      expect(expires.at).toBe(1_600_000);

      return retry({ after: 400_000 });
    },
  );
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(0);

  expect(junction.inbox.get()).toMatchObject([
    {
      state: "retry-scheduled",
      retry: { at: 1_400_000 },
      expires: { at: 1_600_000 },
    },
  ]);

  await vi.advanceTimersByTimeAsync(400_000);

  expect(attempts).toEqual([1, 2]);
  expect(junction.inbox.get()).toEqual([]);
  expect(events).toContain('intent expired {"running":false}');
});

test("the deadline passing during an attempt invalidates it, and the intent ends expired when the handler settles", async () => {
  const { junction, events } = start();
  const held = createDeferred();
  const signals: AbortSignal[] = [];

  junction.subscribe(
    "showAnnouncement",
    (_payload, { signal }) => {
      signals.push(signal);

      return held.promise;
    },
    { timeout: 2_147_483_647 },
  );
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(600_000);

  expect(signals[0]?.aborted).toBe(true);
  expect(junction.inbox.get()).toMatchObject([{ state: "leased" }]);

  held.resolve();
  await vi.advanceTimersByTimeAsync(0);

  expect(junction.inbox.get()).toEqual([]);
  expect(events).toContain('intent expired {"running":true}');
});

test("a commit that came before the deadline still counts after it", async () => {
  const { junction, events } = start();
  const held = createDeferred();

  junction.subscribe(
    "showAnnouncement",
    async (_payload, { commit }) => {
      commit(() => {});
      await held.promise;
    },
    { timeout: 2_147_483_647 },
  );
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(600_000);
  held.resolve();
  await vi.advanceTimersByTimeAsync(0);

  expect(events).toContain('intent acknowledged {"ignored":null}');
});

test("a wall clock set backwards never moves Junction's time back: each deadline stays where it was, and comes due once its lifetime has passed", async () => {
  const { junction } = start();

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });

  vi.setSystemTime(500_000);
  await junction.dispatch("showAnnouncement", { announcementId: "a-2" });
  await vi.advanceTimersByTimeAsync(0);

  expect(junction.inbox.get()).toMatchObject([
    { timestamp: 1_000_000, expires: { at: 1_600_000 } },
    { timestamp: 1_000_000, expires: { at: 1_600_000 } },
  ]);

  await vi.advanceTimersByTimeAsync(599_999);

  expect(junction.inbox.get()).toHaveLength(2);

  await vi.advanceTimersByTimeAsync(1);

  expect(junction.inbox.get()).toEqual([]);
});

test("an intent a listener ends while the expiry sweep runs is ended once", async () => {
  const { junction } = start();
  const ends: string[] = [];
  const ids: string[] = [];

  junction.diagnostics.events.subscribe(({ type, intent }) => {
    if (
      intent === null ||
      !["intent expired", "intent cancelled"].includes(type)
    ) {
      return;
    }

    ends.push(`${ids.indexOf(intent.id)} ${type}`);

    if (intent.id === ids[0]) {
      junction.cancel(ids[1] ?? "");
    }
  });

  for (const announcementId of ["first", "second"]) {
    const admission = await junction.dispatch("showAnnouncement", {
      announcementId,
    });

    ids.push(admission.status === "accepted" ? admission.intent.id : "");
  }

  await vi.advanceTimersByTimeAsync(600_000);

  expect(ends).toEqual(["0 intent expired", "1 intent cancelled"]);
});

test("a retry asked for while the wall clock is set back comes due after its delay, as it would without the change", async () => {
  const { junction } = start();
  const runs: number[] = [];

  junction.subscribe("showAnnouncement", (_payload, { attempt, retry }) => {
    runs.push(attempt.number);

    if (attempt.number > 1) {
      return undefined;
    }

    vi.setSystemTime(1_000_000 - 3_600_000);

    return retry({ after: 5 });
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(4);

  expect(runs).toEqual([1]);

  await vi.advanceTimersByTimeAsync(1);

  expect(runs).toEqual([1, 2]);
});
