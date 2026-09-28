import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";

import { createMockSource } from "src/mock/createMockSource";
import { createMockStorage } from "src/mock/createMockStorage";
import type { MockStorage } from "src/mock/types/MockStorage";
import type { JunctionDiagnosticEvent } from "src/types/JunctionDiagnosticEvent";
import { createDeferred } from "src/utils/common/createDeferred";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";
import { JunctionError } from "src/utils/JunctionError";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.useRealTimers();
});

const OpenDocument = z.object({ documentId: z.string().min(1) }).strict();

const intents = {
  openDocument: intent(OpenDocument, { persist: { schema: OpenDocument } }),
  showAnnouncement: intent(
    z.object({ announcementId: z.string().min(1) }).strict(),
  ),
};

const createPersistentJunction = ({
  storage = createMockStorage(),
  now,
  timeout,
}: {
  storage?: MockStorage;
  now?: () => number;
  timeout?: { storage: number };
} = {}) => {
  const links = createMockSource<{ url: string }>({ resource: "linking" });

  const junction = new Junction({
    intents,
    storage: storage.storage,
    sources: { links: links.source },
    routes: ({ from }) => ({
      documentUrl: from.links.url({
        url: "https://app.example.com/documents/:documentId",
        intent: "openDocument",
        payload: ({ params }) => ({ documentId: params.documentId }),
      }),
    }),
    now,
    timeout,
  });

  return { junction, links, control: storage.control };
};

const restart = (
  control: MockStorage["control"],
  options: { now?: () => number } = {},
) =>
  createPersistentJunction({
    ...options,
    storage: createMockStorage({ stored: control.stored() }),
  });

const getIds = (junction: { inbox: { get: () => { id: string }[] } }) =>
  junction.inbox.get().map(({ id }) => id);

test("a persistent intent without storage is misconfiguration", () => {
  expect(() => new Junction({ intents })).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message: "intents.openDocument persists, so the Junction needs storage.",
    }),
  );
});

test("the storage moves from idle through hydrating to ready, and start's report names it", async () => {
  const storage = createMockStorage({ read: "hold" });
  const { junction } = createPersistentJunction({ storage });

  expect(junction.storage.status.get()).toEqual({ state: "idle" });

  const started = junction.start();

  expect(junction.storage.status.get()).toEqual({ state: "hydrating" });

  storage.control.read.settle();

  await expect(started).resolves.toEqual({
    state: "started",
    storage: "ready",
    sources: [{ name: "links", initial: "none" }],
  });
  expect(junction.storage.status.get()).toEqual({
    state: "ready",
    durability: "committed",
  });
});

test("PER-01 what arrives while the storage restores waits, keeps its receipt time, and is admitted after the stored intents", async () => {
  const clock = { now: 1_000_000 };
  const first = createPersistentJunction({ now: () => clock.now });

  await first.junction.start();
  await first.junction.dispatch("openDocument", { documentId: "stored" });
  first.junction.dispose();

  const storage = createMockStorage({
    stored: first.control.stored(),
    read: "hold",
  });

  const { junction, links } = createPersistentJunction({
    storage,
    now: () => clock.now,
  });

  junction.start();
  clock.now = 1_005_000;

  const live = links.control.emit({
    input: { url: "https://app.example.com/documents/live" },
  });

  await tick();

  expect(junction.inbox.get()).toEqual([]);

  clock.now = 1_009_000;
  storage.control.read.settle();

  await expect(live).resolves.toEqual({
    status: "accepted",
    intent: { id: expect.any(String) },
    durability: "committed",
  });
  await tick();
  expect(junction.inbox.get()).toMatchObject([
    { payload: { documentId: "stored" }, timestamp: 1_000_000 },
    { payload: { documentId: "live" }, timestamp: 1_005_000 },
  ]);
});

test("PER-02 a persistent admission whose write fails before committing answers unconfirmed, and no handler runs until a write succeeds", async () => {
  const { junction, control } = createPersistentJunction();
  const handler = vi.fn();

  await junction.start();
  junction.subscribe("openDocument", handler);
  control.hold();

  const admission = junction.dispatch("openDocument", { documentId: "d" });

  await tick();
  control.writes[0]?.fail({ committed: false });

  await expect(admission).resolves.toEqual({
    status: "unconfirmed",
    intent: { id: expect.any(String) },
  });
  await tick();

  expect(handler).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toMatchObject([
    { state: "pending", waiting: { reason: "storage" }, attempts: 0 },
  ]);
  expect(junction.storage.status.get()).toEqual({
    state: "ready",
    durability: "unconfirmed",
  });
  expect(control.stored()).toBe(undefined);

  control.release();
  await tick();

  expect(handler.mock.calls).toEqual([
    [{ documentId: "d" }, expect.anything()],
  ]);
});

test("PER-03 a write that commits and then reports failure answers unconfirmed, and flush retries the same operation", async () => {
  const { junction, control } = createPersistentJunction();

  await junction.start();
  control.failNext({ committed: true });

  await expect(
    junction.dispatch("openDocument", { documentId: "d" }),
  ).resolves.toMatchObject({ status: "unconfirmed" });
  expect(control.stored()).toMatchObject({
    intents: [{ payload: { documentId: "d" }, state: { state: "pending" } }],
  });

  await expect(junction.storage.flush()).resolves.toEqual({
    state: "ready",
    durability: "committed",
  });
  expect(control.writes.map(({ operation }) => operation.id)).toEqual([
    control.writes[0]?.operation.id,
    control.writes[0]?.operation.id,
  ]);
});

test("PER-04 a restart after the admission restores the intent pending, with its id, payload and deadline", async () => {
  const { junction, control } = createPersistentJunction();

  await junction.start();

  const admission = await junction.dispatch("openDocument", {
    documentId: "d",
  });

  const [entry] = junction.inbox.get();

  junction.dispose();

  const restarted = restart(control);

  await restarted.junction.start();

  expect(admission).toMatchObject({
    status: "accepted",
    durability: "committed",
  });
  expect(restarted.junction.inbox.get()).toEqual([
    expect.objectContaining({
      id: entry?.id,
      name: "openDocument",
      payload: { documentId: "d" },
      timestamp: entry?.timestamp,
      expires: entry?.expires,
      binding: { kind: "public" },
      attempts: 0,
      state: "pending",
    }),
  ]);
});

test("PER-05 a restart after the lease write restores the intent interrupted, since its handler may have run", async () => {
  const { junction, control } = createPersistentJunction();
  const held = createDeferred();

  await junction.start();
  junction.subscribe("openDocument", () => held.promise);
  await junction.dispatch("openDocument", { documentId: "d" });
  await tick();

  expect(control.stored()).toMatchObject({
    intents: [{ state: { state: "leased" }, attempts: 1 }],
  });

  junction.dispose();

  const restarted = restart(control);
  const handler = vi.fn();

  await restarted.junction.start();
  restarted.junction.subscribe("openDocument", handler);
  await tick();

  expect(restarted.junction.inbox.get()).toMatchObject([
    {
      state: "interrupted",
      error: { code: "PROCESS_RESTARTED" },
      attempts: 1,
    },
  ]);
  expect(handler).not.toHaveBeenCalled();
});

test("PER-06 a restart after the effect but before the terminal write never claims the intent handled, and never replays it", async () => {
  const { junction, control } = createPersistentJunction();
  const effect = vi.fn();

  await junction.start();
  junction.subscribe("openDocument", (_payload, { commit }) => {
    control.hold();

    return commit(effect);
  });
  await junction.dispatch("openDocument", { documentId: "d" });
  await tick();

  expect(effect.mock.calls).toEqual([[]]);
  expect(junction.inbox.get()).toEqual([]);

  junction.dispose();

  const restarted = restart(control);
  const handler = vi.fn();

  await restarted.junction.start();
  restarted.junction.subscribe("openDocument", handler);
  await tick();

  expect(restarted.junction.inbox.get()).toMatchObject([
    { state: "interrupted", error: { code: "PROCESS_RESTARTED" } },
  ]);
  expect(handler).not.toHaveBeenCalled();
});

test("PER-07 a failed acknowledgement write is retried by flush, never by running the handler again", async () => {
  const { junction, control } = createPersistentJunction();

  const handler = vi.fn(() => {
    control.failNext({ committed: false });
  });

  await junction.start();
  junction.subscribe("openDocument", handler);
  await junction.dispatch("openDocument", { documentId: "d" });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(junction.storage.status.get()).toEqual({
    state: "ready",
    durability: "unconfirmed",
  });
  expect(control.stored()).toMatchObject({
    intents: [{ state: { state: "leased" } }],
  });

  await expect(junction.storage.flush()).resolves.toEqual({
    state: "ready",
    durability: "committed",
  });
  expect(control.stored()).toMatchObject({ intents: [] });
  expect(handler.mock.calls).toHaveLength(1);
});

test("PER-08 a replayed occurrence while the acknowledgement is unconfirmed is a duplicate, never a second record", async () => {
  const { junction, control } = createPersistentJunction();

  const handler = vi.fn(() => {
    control.failNext({ committed: false });
  });

  await junction.start();
  junction.subscribe("openDocument", handler);

  const first = await junction.dispatch(
    "openDocument",
    { documentId: "d" },
    { interaction: { key: "press-1" } },
  );

  await tick();

  const replay = await junction.dispatch(
    "openDocument",
    { documentId: "d" },
    { interaction: { key: "press-1" } },
  );

  await tick();

  expect(replay).toEqual({
    status: "duplicate",
    intent: first.status === "accepted" ? first.intent : { id: "" },
    durability: "committed",
  });
  expect(handler.mock.calls).toHaveLength(1);
  expect(junction.inbox.get()).toEqual([]);
});

test("PER-09 an intent that expired while the app was closed ends when it is restored", async () => {
  const clock = { now: 1_000_000 };

  const { junction, control } = createPersistentJunction({
    now: () => clock.now,
  });

  await junction.start();
  await junction.dispatch("openDocument", { documentId: "d" });
  junction.dispose();

  clock.now += 600_000;

  const restarted = restart(control, { now: () => clock.now });
  const events: string[] = [];

  restarted.junction.diagnostics.events.subscribe(({ type }) =>
    events.push(type),
  );
  await restarted.junction.start();
  await tick();

  expect(restarted.junction.inbox.get()).toEqual([]);
  expect(events).toContain("intent expired");

  await restarted.junction.storage.flush();

  expect(restarted.control.stored()).toMatchObject({ intents: [] });
});

test("PER-10 a wall clock set back since the last write never moves Junction time back, so no deadline grows", async () => {
  const clock = { now: 10_000_000 };

  const { junction, control } = createPersistentJunction({
    now: () => clock.now,
  });

  await junction.start();
  await junction.dispatch("openDocument", { documentId: "stored" });
  junction.dispose();

  clock.now = 10_000_000 - 3_600_000;

  const storage = createMockStorage({ stored: control.stored(), read: "hold" });

  const restarted = createPersistentJunction({ storage, now: () => clock.now });

  restarted.junction.start();

  const staged = restarted.links.control.emit({
    input: { url: "https://app.example.com/documents/staged" },
  });

  storage.control.read.settle();

  await expect(staged).resolves.toMatchObject({ status: "accepted" });
  await restarted.junction.dispatch("openDocument", { documentId: "new" });

  expect(restarted.junction.inbox.get()).toMatchObject([
    { payload: { documentId: "stored" }, expires: { at: 10_600_000 } },
    {
      payload: { documentId: "staged" },
      timestamp: 10_000_000,
      expires: { at: 10_600_000 },
    },
    {
      payload: { documentId: "new" },
      timestamp: 10_000_000,
      expires: { at: 10_600_000 },
    },
  ]);
});

test("a launch read that lands after the storage restored is clamped to the stored clock too, so a clock set back never expires the link that opened the app", async () => {
  const clock = { now: 10_000_000 };

  const { junction, control } = createPersistentJunction({
    now: () => clock.now,
  });

  await junction.start();
  await junction.dispatch("openDocument", { documentId: "stored" });
  junction.dispose();

  clock.now = 10_000_000 - 3_600_000;

  const links = createMockSource<{ url: string }>({
    resource: "linking",
    initial: "hold",
  });

  const restarted = new Junction({
    intents,
    storage: createMockStorage({ stored: control.stored() }).storage,
    sources: { links: links.source },
    routes: ({ from }) => ({
      documentUrl: from.links.url({
        url: "https://app.example.com/documents/:documentId",
        intent: "openDocument",
        payload: ({ params }) => ({ documentId: params.documentId }),
      }),
    }),
    now: () => clock.now,
  });

  const started = restarted.start();

  await tick();
  links.control.initial.settle({
    input: { url: "https://app.example.com/documents/launch" },
  });

  await expect(started).resolves.toMatchObject({
    storage: "ready",
    sources: [{ name: "links", initial: "received" }],
  });
  await tick();

  expect(restarted.inbox.get()).toMatchObject([
    { payload: { documentId: "stored" } },
    {
      payload: { documentId: "launch" },
      timestamp: 10_000_000,
      expires: { at: 10_600_000 },
    },
  ]);
});

test("a claim of deferral that is not a boolean is kept as no claim, so the stored inbox restores", async () => {
  const { junction, links, control } = createPersistentJunction();

  await junction.start();
  await links.control.emit({
    input: { url: "https://app.example.com/documents/d-1" },
    // @ts-expect-error A JavaScript source can claim anything.
    deferred: "yes",
  });

  const restarted = restart(control);

  await expect(restarted.junction.start()).resolves.toMatchObject({
    storage: "ready",
  });
  expect(restarted.junction.inbox.get()).toMatchObject([
    { payload: { documentId: "d-1" }, provenance: { deferred: null } },
  ]);
});

test("a stored value whose reads throw blocks the storage as corrupt, and start still resolves", async () => {
  const { junction } = createPersistentJunction({
    storage: createMockStorage({
      stored: {
        get format(): string {
          throw new Error("the backend is gone");
        },
      },
    }),
  });

  await expect(junction.start()).resolves.toMatchObject({
    storage: "blocked",
  });
  expect(junction.storage.status.get()).toMatchObject({
    state: "blocked",
    error: { code: "STORAGE_CORRUPT" },
  });
});

test("a read that outlived its timeout keeps the storage from being disposed until it settles", async () => {
  vi.useFakeTimers();

  const storage = createMockStorage({ read: "hold" });

  const { junction } = createPersistentJunction({
    storage,
    timeout: { storage: 1_000 },
  });

  const started = junction.start();

  await vi.advanceTimersByTimeAsync(1_000);
  await expect(started).resolves.toMatchObject({ storage: "blocked" });
  junction.dispose();

  expect(storage.control.disposals()).toBe(0);

  storage.control.read.settle();
  await vi.advanceTimersByTimeAsync(0);

  expect(storage.control.disposals()).toBe(1);
});

test("a storage reset while its timed-out read is still in flight is disposed only once that read settles", async () => {
  vi.useFakeTimers();

  const storage = createMockStorage({ read: "hold" });

  const { junction } = createPersistentJunction({
    storage,
    timeout: { storage: 1_000 },
  });

  junction.start();
  await vi.advanceTimersByTimeAsync(1_000);
  await expect(junction.storage.reset()).resolves.toEqual({
    state: "ready",
    durability: "committed",
  });
  junction.dispose();

  expect(storage.control.disposals()).toBe(0);

  storage.control.read.settle();
  await vi.advanceTimersByTimeAsync(0);

  expect(storage.control.disposals()).toBe(1);
});

test("a failed intent's published error is frozen, so no code can change the code its storage writes", async () => {
  const { junction, control } = createPersistentJunction();

  await junction.start();
  junction.subscribe("openDocument", () => {
    throw new Error("api: 503");
  });
  await junction.dispatch("openDocument", { documentId: "d" });
  await tick();

  const [entry] = junction.inbox.get();

  if (entry?.state !== "failed") {
    throw new Error("The intent did not fail.");
  }

  expect(Reflect.set(entry.error, "code", "E_UPSTREAM")).toBe(false);

  await junction.dispatch("openDocument", { documentId: "e" });
  await junction.storage.flush();

  expect(control.stored()).toMatchObject({
    intents: [
      { state: { state: "failed", error: { code: "HANDLER_FAILED" } } },
      {},
    ],
  });
});

test("PER-11 a stored intent its definition now refuses is quarantined with a diagnostic, and never delivered", async () => {
  const { junction, control } = createPersistentJunction();

  await junction.start();
  await junction.dispatch("openDocument", { documentId: "d" });
  junction.dispose();

  const snapshot = z
    .object({
      intents: z.array(z.object({ payload: z.object({}) }).passthrough()),
    })
    .passthrough()
    .parse(control.stored());

  const tampered = {
    ...snapshot,
    intents: snapshot.intents.map((stored) => ({
      ...stored,
      payload: { documentId: "" },
    })),
  };

  const restarted = createPersistentJunction({
    storage: createMockStorage({ stored: tampered }),
  });

  const events: JunctionDiagnosticEvent[] = [];
  const handler = vi.fn();

  restarted.junction.diagnostics.events.subscribe((event) =>
    events.push(event),
  );
  restarted.junction.subscribe("openDocument", handler);
  await restarted.junction.start();
  await tick();

  expect(restarted.junction.inbox.get()).toEqual([]);
  expect(handler).not.toHaveBeenCalled();
  expect(events).toContainEqual(
    expect.objectContaining({
      type: "intent quarantined",
      context: { reason: "invalid-payload" },
    }),
  );
});

test.each<[string, MockStorage, string]>([
  [
    "a corrupt snapshot",
    createMockStorage({ stored: { format: "junction.inbox", version: 1 } }),
    "STORAGE_CORRUPT",
  ],
  [
    "a newer version",
    createMockStorage({ stored: { format: "junction.inbox", version: 2 } }),
    "STORAGE_VERSION_UNSUPPORTED",
  ],
  ["a failed read", createMockStorage({ read: "hold" }), "STORAGE_READ_FAILED"],
])(
  "PER-12 %s blocks the storage instead of starting empty: memory intents run, persistent ones are refused until reset",
  async (_, storage, code) => {
    const { junction } = createPersistentJunction({ storage });
    const announcements = vi.fn();

    const started = junction.start();

    storage.control.read.fail(new Error("The key cannot be read."));

    await expect(started).resolves.toMatchObject({ storage: "blocked" });
    expect(junction.storage.status.get()).toMatchObject({
      state: "blocked",
      error: { code },
    });

    junction.subscribe("showAnnouncement", announcements);

    await expect(
      junction.dispatch("openDocument", { documentId: "d" }),
    ).resolves.toMatchObject({
      status: "rejected",
      reason: "storage-unavailable",
    });
    await junction.dispatch("showAnnouncement", { announcementId: "a" });
    await tick();

    expect(announcements.mock.calls).toHaveLength(1);

    await expect(junction.storage.reset()).resolves.toEqual({
      state: "ready",
      durability: "committed",
    });
    expect(storage.control.stored()).toMatchObject({
      format: "junction.inbox",
      version: 1,
      intents: [],
      ledger: [],
    });
    await expect(
      junction.dispatch("openDocument", { documentId: "d" }),
    ).resolves.toMatchObject({ status: "accepted", durability: "committed" });
  },
);

test("PER-14 changes made during a write wait for it, and the next snapshot carries every terminal tombstone", async () => {
  const { junction, control } = createPersistentJunction();

  await junction.start();
  junction.subscribe("openDocument", () => {});
  control.hold();
  junction.dispatch(
    "openDocument",
    { documentId: "a" },
    { interaction: { key: "press-a" } },
  );
  junction.dispatch(
    "openDocument",
    { documentId: "b" },
    { interaction: { key: "press-b" } },
  );

  for (let round = 0; round < 20; round += 1) {
    await tick();

    const pending = control.writes.filter(({ state }) => state === "pending");

    expect([0, 1]).toContain(pending.length);

    if (pending.length === 0) {
      break;
    }

    pending[0]?.commit();
  }

  expect(control.stored()).toMatchObject({
    intents: [],
    ledger: [
      { key: '["dispatch","press-a"]' },
      { key: '["dispatch","press-b"]' },
    ],
  });
});

test("PER-15 flush waits for the changes made before it, never for a handler still running", async () => {
  const { junction } = createPersistentJunction();
  const held = createDeferred();

  await junction.start();
  junction.subscribe("openDocument", () => held.promise);
  await junction.dispatch("openDocument", { documentId: "d" });
  await tick();

  expect(junction.inbox.get()).toMatchObject([{ state: "leased" }]);
  await expect(junction.storage.flush()).resolves.toEqual({
    state: "ready",
    durability: "committed",
  });
  held.resolve();
});

test("PER-16 dispose during a write silences the Junction at once, while the write in flight may still commit", async () => {
  const { junction, control } = createPersistentJunction();

  await junction.start();
  control.hold();

  const admission = junction.dispatch("openDocument", { documentId: "d" });

  junction.dispose();

  await expect(admission).resolves.toMatchObject({ status: "unconfirmed" });
  expect(control.disposals()).toBe(0);

  control.writes[0]?.commit();
  await tick();

  expect(control.stored()).toMatchObject({
    intents: [{ payload: { documentId: "d" } }],
  });
  expect(control.disposals()).toBe(1);
  expect(junction.storage.status.get()).toEqual({ state: "disposed" });
});

test("a dispatch after dispose while the storage restores is refused as disposed, never left pending", async () => {
  const { junction } = createPersistentJunction({
    storage: createMockStorage({ read: "hold" }),
  });

  junction.start();
  junction.dispose();

  const admission = junction.dispatch("showAnnouncement", {
    announcementId: "a-1",
  });

  await expect(
    Promise.race([admission, tick().then(() => "pending")]),
  ).resolves.toMatchObject({ status: "rejected", reason: "disposed" });
});

test("dispose while the storage restores settles start at once and leaves no timer, then disposes the storage once its read settles, writing nothing", async () => {
  vi.useFakeTimers();

  const storage = createMockStorage({ read: "hold" });
  const { junction } = createPersistentJunction({ storage });
  const started = junction.start();

  junction.dispose();

  await expect(started).resolves.toMatchObject({
    state: "disposed",
    storage: "none",
  });
  expect(vi.getTimerCount()).toBe(0);
  expect(storage.control.disposals()).toBe(0);

  storage.control.read.settle();
  await vi.advanceTimersByTimeAsync(0);

  expect(storage.control.disposals()).toBe(1);
  expect(storage.control.writes).toEqual([]);
});

test("dispose disposes a blocked storage too, and a storage dispose that throws is contained and recorded", async () => {
  const blocked = createMockStorage({ stored: "not a snapshot" });

  const dispose = vi.fn(() => {
    throw new Error("the database is locked");
  });

  const { junction } = createPersistentJunction({
    storage: { ...blocked, storage: { ...blocked.storage, dispose } },
  });

  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type }) => events.push(type));
  await junction.start();

  expect(junction.storage.status.get()).toMatchObject({ state: "blocked" });
  expect(() => junction.dispose()).not.toThrow();
  expect(dispose.mock.calls).toEqual([[]]);
  expect(events).toContain("storage dispose failed");
});

test("a storage read that outlives its timeout blocks the storage, what staged meanwhile is admitted, and a late read changes nothing", async () => {
  vi.useFakeTimers();

  const storage = createMockStorage({ read: "hold" });

  const { junction } = createPersistentJunction({
    storage,
    timeout: { storage: 5_000 },
  });

  const handler = vi.fn();
  const started = junction.start();

  junction.subscribe("showAnnouncement", handler);

  const memory = junction.dispatch("showAnnouncement", {
    announcementId: "a-1",
  });

  const persistent = junction.dispatch("openDocument", { documentId: "d" });

  await vi.advanceTimersByTimeAsync(5_000);

  await expect(started).resolves.toMatchObject({ storage: "blocked" });
  await expect(memory).resolves.toMatchObject({ status: "accepted" });
  await expect(persistent).resolves.toMatchObject({
    status: "rejected",
    reason: "storage-unavailable",
  });
  expect(handler.mock.calls).toEqual([
    [{ announcementId: "a-1" }, expect.anything()],
  ]);

  const blocked = junction.storage.status.get();

  expect(blocked).toEqual({
    state: "blocked",
    error: new JunctionError({
      code: "STORAGE_READ_FAILED",
      message: "The storage read outlived its timeout.",
    }),
  });

  storage.control.read.settle();
  await vi.advanceTimersByTimeAsync(0);

  expect(junction.storage.status.get()).toBe(blocked);
});

test("a storage write that outlives its timeout counts as unconfirmed: memory intents run, persistent ones wait until a write lands", async () => {
  vi.useFakeTimers();

  const { junction, control } = createPersistentJunction({
    timeout: { storage: 5_000 },
  });

  const persistent = vi.fn();
  const memory = vi.fn();

  junction.start();
  await vi.advanceTimersByTimeAsync(0);
  junction.subscribe("openDocument", persistent);
  junction.subscribe("showAnnouncement", memory);
  control.hold();

  const admission = junction.dispatch("openDocument", { documentId: "d" });

  await vi.advanceTimersByTimeAsync(0);
  junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(5_000);

  await expect(admission).resolves.toEqual({
    status: "unconfirmed",
    intent: { id: junction.inbox.get()[0]?.id },
  });
  expect(persistent).not.toHaveBeenCalled();
  expect(memory.mock.calls).toEqual([
    [{ announcementId: "a-1" }, expect.anything()],
  ]);
  expect(junction.inbox.get()).toMatchObject([
    { name: "openDocument", attempts: 0, waiting: { reason: "storage" } },
  ]);
  await expect(junction.storage.flush()).resolves.toEqual({
    state: "ready",
    durability: "unconfirmed",
  });

  control.release();
  await vi.advanceTimersByTimeAsync(0);

  expect(persistent.mock.calls).toEqual([
    [{ documentId: "d" }, expect.anything()],
  ]);
});

test("a restart after the terminal write keeps the intent ended, and a replay of its occurrence is a duplicate", async () => {
  const { junction, control } = createPersistentJunction();

  await junction.start();
  junction.subscribe("openDocument", () => {});

  const first = await junction.dispatch(
    "openDocument",
    { documentId: "d" },
    { interaction: { key: "press-1" } },
  );

  await tick();
  await junction.storage.flush();
  junction.dispose();

  const restarted = restart(control);

  await restarted.junction.start();

  expect(restarted.junction.inbox.get()).toEqual([]);
  await expect(
    restarted.junction.dispatch(
      "openDocument",
      { documentId: "d" },
      { interaction: { key: "press-1" } },
    ),
  ).resolves.toEqual({
    status: "duplicate",
    intent: first.status === "accepted" ? first.intent : { id: "" },
    durability: "committed",
  });
});

test("a consumer disposed while its lease is being written gets nothing, and the intent waits again with its attempt undone", async () => {
  const { junction, control } = createPersistentJunction();
  const handler = vi.fn();

  await junction.start();

  const registration = junction.subscribe("openDocument", handler);

  control.hold();
  junction.dispatch("openDocument", { documentId: "d" });
  await tick();
  registration.dispose();

  control.release();
  await tick();

  expect(handler).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toMatchObject([
    { state: "pending", waiting: { reason: "no-consumer" }, attempts: 0 },
  ]);
});

test("a cancel while the lease is being written ends the intent cancelled, and its handler never runs", async () => {
  const { junction, control } = createPersistentJunction();
  const handler = vi.fn();

  await junction.start();
  junction.subscribe("openDocument", handler);
  control.hold();

  const admission = await Promise.race([
    junction.dispatch("openDocument", { documentId: "d" }),
    tick().then(() => null),
  ]);

  await tick();

  const [entry] = junction.inbox.get();

  await expect(junction.cancel(entry?.id ?? "")).resolves.toEqual({
    status: "requested",
  });

  control.release();
  await tick();

  expect(admission).toBe(null);
  expect(handler).not.toHaveBeenCalled();
  expect(getIds(junction)).toEqual([]);
});

test("a cancel while the lease is being written, after its consumer was disposed, still ends the intent cancelled", async () => {
  const { junction, control } = createPersistentJunction();
  const handler = vi.fn();

  await junction.start();

  const registration = junction.subscribe("openDocument", handler);

  control.hold();
  junction.dispatch("openDocument", { documentId: "d" });
  await tick();
  registration.dispose();

  const [entry] = junction.inbox.get();

  await expect(junction.cancel(entry?.id ?? "")).resolves.toEqual({
    status: "requested",
  });

  control.release();
  await tick();

  expect(handler).not.toHaveBeenCalled();
  expect(getIds(junction)).toEqual([]);
});

test("a second owner that appears while the lease is being written makes the intent ambiguous again, and neither handler runs", async () => {
  const { junction, control } = createPersistentJunction();
  const first = vi.fn();
  const second = vi.fn();

  await junction.start();
  junction.subscribe("openDocument", first);
  control.hold();
  junction.dispatch("openDocument", { documentId: "d" });
  await tick();
  junction.subscribe("openDocument", second);
  control.release();
  await tick();

  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  expect(junction.inbox.get()).toMatchObject([
    {
      state: "pending",
      waiting: { reason: "ambiguous-consumer" },
      attempts: 0,
    },
  ]);
});

test("a persist schema that refuses the payload it would store rejects the admission at once, never after a restart", async () => {
  const Counted = z.object({ count: z.string().transform(Number) });

  const junction = new Junction({
    intents: { counted: intent(Counted, { persist: { schema: Counted } }) },
    storage: createMockStorage().storage,
  });

  await junction.start();

  await expect(junction.dispatch("counted", { count: "3" })).resolves.toEqual({
    status: "rejected",
    reason: "invalid-payload",
    retryable: false,
    issues: [
      {
        path: "",
        message:
          "persist.schema refuses the payload this intent would store, so it could never be restored.",
      },
    ],
  });
});

test("a persist schema that would restore another payload than it stores rejects the admission at once, so no restart loses a field", async () => {
  const Comment = z.object({
    documentId: z.string(),
    commentId: z.string().optional(),
  });

  const junction = new Junction({
    intents: {
      openComment: intent(Comment, {
        persist: { schema: z.object({ documentId: z.string() }) },
      }),
    },
    storage: createMockStorage().storage,
  });

  await junction.start();

  await expect(
    junction.dispatch("openComment", { documentId: "d-42", commentId: "c-7" }),
  ).resolves.toEqual({
    status: "rejected",
    reason: "invalid-payload",
    retryable: false,
    issues: [
      {
        path: "",
        message:
          "persist.schema restores another payload than the one this intent would store.",
      },
    ],
  });
  await expect(
    junction.dispatch("openComment", { documentId: "d-42" }),
  ).resolves.toMatchObject({ status: "accepted" });
});

test("a status listener that disposes the Junction as a write begins starts no storage call after dispose returns", async () => {
  const { junction, control } = createPersistentJunction();

  await junction.start();

  let started = -1;

  junction.storage.status.subscribe(() => {
    const status = junction.storage.status.get();

    if (status.state === "ready" && status.durability === "pending") {
      started = control.writes.length;
      junction.dispose();
    }
  });
  junction.dispatch("openDocument", { documentId: "d" });
  await tick();

  expect(started).toBe(1);
  expect(control.writes).toHaveLength(1);
});

test("a lease undone by its failed write is followed by intent waiting, and the next lease reuses its attempt number", async () => {
  const { junction, control } = createPersistentJunction();
  const timeline: string[] = [];
  const handler = vi.fn();

  junction.diagnostics.events.subscribe((event) => {
    if (event.type === "attempt started") {
      timeline.push(`attempt started ${event.context.attempt.number}`);

      return;
    }

    if (event.type === "intent waiting") {
      timeline.push(`intent waiting ${event.context.reason}`);
    }
  });
  await junction.start();
  await junction.dispatch("openDocument", { documentId: "d" });
  control.failNext({ committed: false });
  junction.subscribe("openDocument", handler);
  await tick();

  expect(handler).toHaveBeenCalledTimes(1);
  expect(timeline).toEqual([
    "intent waiting no-consumer",
    "attempt started 1",
    "intent waiting storage",
    "attempt started 1",
  ]);
});

test("a retry and a cancel made while the storage restores wait for it, and act on the intent it restores", async () => {
  const first = createPersistentJunction();

  await first.junction.start();
  first.junction.subscribe("openDocument", () => {
    throw new Error("api: 503");
  });
  await first.junction.dispatch("openDocument", { documentId: "d" });
  await tick();

  const [failed] = first.junction.inbox.get();

  first.junction.dispose();

  if (failed?.state !== "failed") {
    throw new Error("The intent did not fail.");
  }

  const storage = createMockStorage({
    stored: first.control.stored(),
    read: "hold",
  });

  const { junction } = createPersistentJunction({ storage });

  junction.start();

  const retried = junction.retry(failed.id);
  const cancelled = junction.cancel(failed.id);

  storage.control.read.settle();

  await expect(retried).resolves.toEqual({ status: "applied" });
  await expect(cancelled).resolves.toEqual({ status: "applied" });
  expect(junction.inbox.get()).toEqual([]);
});

test("a restart from a checkpoint a year ahead of the wall clock keeps Junction time moving, so intents still expire after their own lifetime", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000 + 365 * 86_400_000);

  const { junction, control } = createPersistentJunction();

  await junction.start();
  await junction.dispatch("openDocument", { documentId: "ahead" });
  junction.dispose();
  vi.setSystemTime(1_000_000);

  const restarted = restart(control);

  await restarted.junction.start();
  await restarted.junction.dispatch("openDocument", { documentId: "after" });

  expect(restarted.junction.inbox.get()).toHaveLength(2);

  await vi.advanceTimersByTimeAsync(600_000);

  expect(restarted.junction.inbox.get()).toEqual([]);
});
