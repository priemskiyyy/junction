import { afterEach, expect, test, vi } from "vitest";

import { createMockSource } from "src/mock/createMockSource";
import { createMockStorage } from "src/mock/createMockStorage";
import type { IncomingSource } from "src/types/IncomingSource";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { SourceSink } from "src/types/SourceSink";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";
import { JunctionError } from "src/utils/JunctionError";
import {
  ANNOUNCEMENT_URL,
  createJunction,
  intents,
  tick,
} from "src/utils/junction.fixture";
import { z } from "zod";

afterEach(() => {
  vi.useRealTimers();
});

test("constructing a Junction attaches no source, reads no identity and schedules nothing", async () => {
  const get = vi.fn((): JunctionIdentity => ({ status: "anonymous" }));
  const subscribe = vi.fn(() => () => {});
  const links = createMockSource<{ url: string }>();

  const junction = new Junction({
    intents,
    identity: { get, subscribe },
    sources: { links: links.source },
  });

  await tick();

  expect(links.control.attachments).toEqual([]);
  expect(get).not.toHaveBeenCalled();
  expect(subscribe).not.toHaveBeenCalled();
  expect(junction.source("links").status.get()).toEqual({ state: "idle" });
  expect(junction.diagnostics.get().state).toBe("idle");
});

test("start attaches every source synchronously and once, however often it is called", () => {
  const { junction, links } = createJunction();

  const first = junction.start();

  expect(links.attachments).toHaveLength(1);
  expect(junction.start()).toBe(first);
  expect(links.attachments).toHaveLength(1);
  expect(junction.source("links").status.get()).toEqual({
    state: "attached",
    initial: "none",
    error: null,
  });
});

test("start resolves with each source's launch read, an empty launch included", async () => {
  const { junction } = createJunction({ initial: null });

  await expect(junction.start()).resolves.toEqual({
    state: "started",
    storage: "none",
    sources: [{ name: "links", initial: "empty" }],
  });
  expect(junction.source("links").status.get()).toEqual({
    state: "attached",
    initial: "empty",
    error: null,
  });
});

test("a launch link is admitted as the initial intent", async () => {
  const { junction } = createJunction({
    initial: { input: { url: ANNOUNCEMENT_URL } },
  });

  await expect(junction.start()).resolves.toEqual({
    state: "started",
    storage: "none",
    sources: [{ name: "links", initial: "received" }],
  });
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      name: "showAnnouncement",
      payload: { announcementId: "announcement-1" },
      provenance: {
        kind: "source",
        source: { name: "links" },
        route: { id: "announcementUrl" },
        initial: true,
        deferred: null,
      },
    },
  ]);
});

test("a live link that arrives while the launch read is pending is not lost", async () => {
  const { junction, links } = createJunction({ initial: "hold" });

  const started = junction.start();

  await expect(
    links.emit({ input: { url: ANNOUNCEMENT_URL } }),
  ).resolves.toMatchObject({ status: "accepted" });

  links.initial.settle(null);

  await expect(started).resolves.toMatchObject({
    sources: [{ name: "links", initial: "empty" }],
  });
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    { name: "showAnnouncement", provenance: { initial: false } },
  ]);
});

test("a launch read that fails leaves the live stream working, and start still resolves", async () => {
  const { junction, links } = createJunction({ initial: "hold" });

  const started = junction.start();

  links.initial.fail(new Error("getInitialURL rejected"));

  await expect(started).resolves.toEqual({
    state: "started",
    storage: "none",
    sources: [{ name: "links", initial: "failed" }],
  });
  expect(junction.source("links").status.get()).toMatchObject({
    state: "attached",
    initial: "failed",
    error: { code: "INITIAL_READ_FAILED" },
  });
  await expect(
    links.emit({ input: { url: ANNOUNCEMENT_URL } }),
  ).resolves.toMatchObject({ status: "accepted" });
});

test("a launch read that lands after its timeout is still admitted, with the receipt time it started at", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);

  const { junction, links } = createJunction({
    initial: "hold",
    timeout: { initial: 2_000 },
  });

  const started = junction.start();

  vi.advanceTimersByTime(2_000);

  await expect(started).resolves.toEqual({
    state: "started",
    storage: "none",
    sources: [{ name: "links", initial: "timed-out" }],
  });

  vi.setSystemTime(1_005_000);
  links.initial.settle({ input: { url: ANNOUNCEMENT_URL } });
  await vi.advanceTimersByTimeAsync(0);

  expect(junction.inbox.get()).toMatchObject([
    {
      name: "showAnnouncement",
      timestamp: 1_000_000,
      expires: { at: 1_600_000 },
      provenance: { initial: true },
    },
  ]);
});

test("a source that pushes while attaching is admitted in order once attach returns", async () => {
  const links = createMockSource<{ url: string }>({
    onAttach: (sink) => {
      sink.push({ input: { url: "myapp://announcements/first" } });
      sink.push({ input: { url: "myapp://announcements/second" } });
    },
  });

  const junction = new Junction({
    intents,
    identity: {
      get: () => ({ status: "anonymous" }),
      subscribe: () => () => {},
    },
    sources: { links: links.source },
    routes: ({ from }) => ({
      announcementUrl: from.links.url({
        url: "myapp://announcements/:announcementId",
        intent: "showAnnouncement",
        payload: ({ params }) => ({ announcementId: params.announcementId }),
      }),
    }),
  });

  junction.start();
  await tick();

  expect(junction.inbox.get().map(({ payload }) => payload)).toEqual([
    { announcementId: "first" },
    { announcementId: "second" },
  ]);
});

test("a source that pushes and then throws while attaching fails alone, and what it pushed never escapes", async () => {
  const broken = createMockSource<{ url: string }>({
    onAttach: (sink) => {
      sink.push({ input: { url: "myapp://announcements/escaped" } });

      throw new Error("the SDK is not linked");
    },
  });

  const healthy = createMockSource<{ url: string }>();

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { broken: broken.source, healthy: healthy.source },
    routes: ({ from }) => ({
      announcementUrl: from.broken.url({
        url: "myapp://announcements/:announcementId",
        intent: "showAnnouncement",
        payload: ({ params }) => ({ announcementId: params.announcementId }),
      }),
    }),
  });

  await expect(junction.start()).resolves.toEqual({
    state: "started",
    storage: "none",
    sources: [
      { name: "broken", initial: "not-attached" },
      { name: "healthy", initial: "none" },
    ],
  });
  await tick();

  expect(junction.source("broken").status.get()).toMatchObject({
    state: "failed",
    error: { code: "SOURCE_FAILED" },
  });
  expect(junction.source("healthy").status.get()).toMatchObject({
    state: "attached",
  });
  expect(junction.inbox.get()).toEqual([]);
});

test("a launch read that answers something other than an observation fails the read, and start still resolves", async () => {
  const broken: IncomingSource<{ url: string }, null> = {
    name: "broken",
    native: null,
    resource: null,
    attach: () => ({
      // @ts-expect-error A JavaScript source can resolve its launch read with nothing at all.
      initial: () => Promise.resolve(undefined),
    }),
  };

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { broken },
  });

  await expect(junction.start()).resolves.toEqual({
    state: "started",
    storage: "none",
    sources: [{ name: "broken", initial: "failed" }],
  });
  expect(junction.source("broken").status.get()).toMatchObject({
    state: "attached",
    initial: "failed",
    error: { code: "INITIAL_READ_FAILED" },
  });
});

test("a source whose attach answers nothing fails alone, and start neither throws nor attaches twice", async () => {
  const healthy = createMockSource<{ url: string }>();

  let attachments = 0;

  const broken: IncomingSource<{ url: string }, null> = {
    name: "broken",
    native: null,
    resource: null,
    // @ts-expect-error A JavaScript source can forget to return its attachment.
    attach: () => {
      attachments += 1;
    },
  };

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { broken, healthy: healthy.source },
  });

  const started = junction.start();

  await expect(started).resolves.toEqual({
    state: "started",
    storage: "none",
    sources: [
      { name: "broken", initial: "not-attached" },
      { name: "healthy", initial: "none" },
    ],
  });
  expect(junction.start()).toBe(started);
  expect(attachments).toBe(1);
  expect(healthy.control.attachments).toHaveLength(1);
  expect(junction.source("broken").status.get()).toMatchObject({
    state: "failed",
    error: { code: "SOURCE_FAILED" },
  });
});

test("a push of something that is not an observation is refused, never thrown back into the source or out of start", async () => {
  const sink: { push: SourceSink<{ url: string }>["push"] | null } = {
    push: null,
  };

  const broken: IncomingSource<{ url: string }, null> = {
    name: "broken",
    native: null,
    resource: null,
    attach: (attached) => {
      sink.push = attached.push;
      // @ts-expect-error A JavaScript source can push nothing at all.
      attached.push(undefined);

      return {};
    },
  };

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { broken },
    routes: ({ from }) => ({
      announcement: from.broken.url({
        url: "myapp://announcements/:announcementId",
        intent: "showAnnouncement",
        payload: ({ params }) => ({ announcementId: params.announcementId }),
      }),
    }),
  });

  const answers: unknown[] = [];

  await expect(junction.start()).resolves.toMatchObject({
    state: "started",
    sources: [{ name: "broken", initial: "none" }],
  });

  for (const observation of [
    null,
    "myapp://announcements/a-1",
    { input: { url: "myapp://announcements/a-1" }, interaction: {} },
  ]) {
    // @ts-expect-error A JavaScript source can push anything.
    answers.push(await sink.push?.(observation));
  }

  expect(answers).toEqual(
    Array.from({ length: 3 }, () =>
      expect.objectContaining({ status: "rejected", reason: "invalid-input" }),
    ),
  );
  expect(junction.inbox.get()).toEqual([]);
});

test("an attach or a launch read that answers a string fails as a breach of the contract", async () => {
  const attaching: IncomingSource<{ url: string }, null> = {
    name: "attaching",
    native: null,
    resource: null,
    // @ts-expect-error A JavaScript source can answer anything.
    attach: () => "attached",
  };

  const reading: IncomingSource<{ url: string }, null> = {
    name: "reading",
    native: null,
    resource: null,
    attach: () => ({
      // @ts-expect-error A JavaScript source can resolve its launch read with a bare URL.
      initial: () => Promise.resolve("myapp://announcements/a-1"),
    }),
  };

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { attaching, reading },
  });

  await expect(junction.start()).resolves.toMatchObject({
    sources: [
      { name: "attaching", initial: "not-attached" },
      { name: "reading", initial: "failed" },
    ],
  });
  expect(junction.source("attaching").status.get()).toMatchObject({
    state: "failed",
    error: { code: "SOURCE_FAILED" },
  });
});

test("a source whose attach threw stays silenced, so a push from the listener it left behind is never admitted", async () => {
  const broken = createMockSource<{ url: string }>({
    onAttach: () => {
      throw new Error("the SDK is not linked");
    },
  });

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { broken: broken.source },
    routes: ({ from }) => ({
      announcementUrl: from.broken.url({
        url: "myapp://announcements/:announcementId",
        intent: "showAnnouncement",
        payload: ({ params }) => ({ announcementId: params.announcementId }),
      }),
    }),
  });

  await junction.start();

  await expect(
    broken.control.emit({ input: { url: "myapp://announcements/late" } }),
  ).resolves.toMatchObject({ status: "rejected", reason: "disposed" });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
});

test("two sources claiming one native feed is misconfiguration", () => {
  const reactNative = createMockSource<{ url: string }>({
    resource: "linking",
  });

  const expo = createMockSource<{ url: string }>({ resource: "linking" });

  expect(
    () =>
      new Junction({
        intents,
        identity: {
          get: () => ({ status: "anonymous" }),
          subscribe: () => () => {},
        },
        sources: { links: reactNative.source, expoLinks: expo.source },
      }),
  ).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message:
        'sources.expoLinks and sources.links both listen to "linking"; one native feed has one owner.',
    }),
  );
});

test("dispose during a pending launch read silences the late answer and every later callback", async () => {
  const { junction, links } = createJunction({ initial: "hold" });

  const started = junction.start();

  junction.dispose();
  links.initial.settle({ input: { url: ANNOUNCEMENT_URL } });

  await expect(started).resolves.toEqual({
    state: "disposed",
    storage: "none",
    sources: [{ name: "links", initial: "not-attached" }],
  });
  await expect(
    links.emit({ input: { url: ANNOUNCEMENT_URL } }),
  ).resolves.toMatchObject({ status: "rejected", reason: "disposed" });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(links.attachments[0]?.disposals).toBe(1);
  expect(junction.source("links").status.get()).toEqual({ state: "disposed" });
});

test("dispose from inside one source's attach attaches no later source, and start answers disposed", async () => {
  const disposing = createMockSource<{ url: string }>({
    onAttach: () => junction.dispose(),
  });

  const later = createMockSource<{ url: string }>();

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { disposing: disposing.source, later: later.source },
  });

  await expect(junction.start()).resolves.toEqual({
    state: "disposed",
    storage: "none",
    sources: [
      { name: "disposing", initial: "not-attached" },
      { name: "later", initial: "not-attached" },
    ],
  });
  expect(disposing.control.attachments[0]?.disposals).toBe(1);
  expect(later.control.attachments).toEqual([]);
  expect(junction.source("later").status.get()).toEqual({ state: "disposed" });
});

test("dispose from inside the identity's subscribe releases it, attaches nothing and reads no storage", async () => {
  const links = createMockSource<{ url: string }>();
  const storage = createMockStorage();
  const release = vi.fn();
  const read = vi.spyOn(storage.storage, "read");

  const junction = new Junction({
    intents,
    identity: {
      get: () => ({ status: "anonymous" }),
      subscribe: () => {
        junction.dispose();

        return release;
      },
    },
    sources: { links: links.source },
    storage: storage.storage,
  });

  await expect(junction.start()).resolves.toEqual({
    state: "disposed",
    storage: "none",
    sources: [],
  });
  expect(release.mock.calls).toEqual([[]]);
  expect(links.control.attachments).toEqual([]);
  expect(read).not.toHaveBeenCalled();
  expect(junction.storage.status.get()).toEqual({ state: "disposed" });
});

test("dispose clears a pending launch read's timer", () => {
  vi.useFakeTimers();

  const { junction } = createJunction({ initial: "hold" });

  junction.start();

  expect(vi.getTimerCount()).toBe(1);

  junction.dispose();

  expect(vi.getTimerCount()).toBe(0);
});

test("a start called from inside start answers the same promise and attaches and reads once", async () => {
  const links = createMockSource<{ url: string }>();
  const storage = createMockStorage();
  const read = vi.spyOn(storage.storage, "read");

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { links: links.source },
    storage: storage.storage,
  });

  const inner: Promise<unknown>[] = [];

  junction.storage.status.subscribe(() => {
    if (inner.length === 0) {
      inner.push(junction.start());
    }
  });

  const outer = junction.start();

  await outer;

  expect(inner).toEqual([outer]);
  expect(inner[0]).toBe(outer);
  expect(read.mock.calls).toEqual([[]]);
  expect(links.control.attachments).toHaveLength(1);
});

test("dispose is idempotent, disposes every attachment once and keeps the inbox's last value", async () => {
  const { junction, links } = createJunction();

  junction.start();
  await links.emit({ input: { url: ANNOUNCEMENT_URL } });
  await tick();

  const inbox = junction.inbox.get();

  junction.dispose();
  junction.dispose();

  expect(links.attachments.map(({ disposals }) => disposals)).toEqual([1]);
  expect(junction.inbox.get()).toBe(inbox);
  await expect(junction.start()).resolves.toEqual({
    state: "disposed",
    storage: "none",
    sources: [],
  });
});

test("a cleanup that throws or rejects is contained, and every other source is still disposed", async () => {
  const throwing = createMockSource<{ url: string }>({
    onDispose: () => {
      throw new Error("remove() threw");
    },
  });

  const rejecting = createMockSource<{ url: string }>({
    onDispose: () => Promise.reject(new Error("unsubscribe rejected")),
  });

  const last = createMockSource<{ url: string }>();

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: {
      throwing: throwing.source,
      rejecting: rejecting.source,
      last: last.source,
    },
  });

  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type, source }) =>
    events.push(`${type}: ${source?.name ?? ""}`),
  );
  junction.start();

  expect(() => junction.dispose()).not.toThrow();
  await tick();

  expect(last.control.attachments[0]?.disposals).toBe(1);
  expect(events).toContain("source dispose failed: throwing");
});

test("a start after dispose attaches nothing", async () => {
  const { junction, links } = createJunction();

  junction.dispose();

  await expect(junction.start()).resolves.toEqual({
    state: "disposed",
    storage: "none",
    sources: [],
  });
  expect(links.attachments).toEqual([]);
});

test("a source's handle exposes the SDK it was given, and an undeclared name is misconfiguration", () => {
  const sdk = { addEventListener: () => ({ remove: () => {} }) };
  const links = createMockSource<{ url: string }, typeof sdk>({ native: sdk });

  const junction = new Junction({
    intents: {
      showAnnouncement: intent(z.object({ announcementId: z.string() })),
    },
    sources: { links: links.source },
  });

  expect(junction.source("links").native).toBe(sdk);
  // @ts-expect-error The Junction declares no referrals source.
  expect(() => junction.source("referrals")).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message:
        'The Junction has no source named "referrals". Its sources are "links".',
    }),
  );
});

test("a launch read keeps what it claims: its deferral, and an occurrence a racing push of the same tap duplicates", async () => {
  const sink: { push: SourceSink<{ announcementId: string }>["push"] | null } =
    {
      push: null,
    };

  const presses: IncomingSource<{ announcementId: string }, null> = {
    name: "presses",
    native: null,
    resource: null,
    attach: (attached) => {
      sink.push = attached.push;

      return {
        initial: () => ({
          input: { announcementId: "announcement-1" },
          deferred: true,
          interaction: { key: "press-1", scope: "installation" },
        }),
      };
    },
  };

  const junction = new Junction({
    intents: {
      showAnnouncement: intent(
        z.object({ announcementId: z.string().min(1) }).strict(),
      ),
    },
    sources: { presses },
    routes: ({ from }) => ({
      press: from.presses.event({
        intent: "showAnnouncement",
        payload: ({ announcementId }) => ({ announcementId }),
      }),
    }),
  });

  await expect(junction.start()).resolves.toMatchObject({
    sources: [{ name: "presses", initial: "received" }],
  });

  const replay = await sink.push?.({
    input: { announcementId: "announcement-1" },
    interaction: { key: "press-1", scope: "installation" },
  });

  expect(junction.inbox.get()).toMatchObject([
    { provenance: { kind: "source", initial: true, deferred: true } },
  ]);
  expect(replay).toMatchObject({ status: "duplicate" });
  junction.dispose();
});

test("a listener that disposes the Junction as its source attaches keeps the launch read from being called, and leaves no timer", async () => {
  vi.useFakeTimers();

  const initial = vi.fn(() => null);

  const source: IncomingSource<{ url: string }, null> = {
    name: "spy",
    native: null,
    resource: null,
    attach: () => ({ initial, dispose: () => {} }),
  };

  const junction = new Junction({
    intents: {
      showAnnouncement: intent(z.object({ announcementId: z.string() })),
    },
    sources: { spy: source },
  });

  junction.diagnostics.events.subscribe((event) => {
    if (event.type === "source attached") {
      junction.dispose();
    }
  });

  await expect(junction.start()).resolves.toMatchObject({
    state: "disposed",
    sources: [{ name: "spy", initial: "not-attached" }],
  });
  expect(initial).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

test("a launch read that answers an object without an input fails the read, never reported as received", async () => {
  const source: IncomingSource<{ url: string }, null> = {
    name: "reading",
    native: null,
    resource: null,
    attach: () => ({
      // @ts-expect-error A JavaScript source can answer its input without wrapping it.
      initial: () => ({ url: "myapp://announcements/a-1" }),
    }),
  };

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { reading: source },
  });

  await expect(junction.start()).resolves.toMatchObject({
    sources: [{ name: "reading", initial: "failed" }],
  });
  expect(junction.source("reading").status.get()).toMatchObject({
    state: "attached",
    initial: "failed",
    error: { code: "INITIAL_READ_FAILED" },
  });
});

test("a provider error reported while attach runs shows on the status once it returns, as a push made then is admitted", async () => {
  const source: IncomingSource<{ url: string }, null> = {
    name: "failing",
    native: null,
    resource: null,
    attach: (sink) => {
      sink.fail(new Error("cached session error"));

      return {};
    },
  };

  const junction = new Junction({
    intents: { showAnnouncement: intents.showAnnouncement },
    sources: { failing: source },
  });

  const types: string[] = [];

  junction.diagnostics.events.subscribe(({ type }) => types.push(type));
  await junction.start();

  expect(junction.source("failing").status.get()).toMatchObject({
    state: "attached",
    error: {
      code: "SOURCE_ERROR",
      cause: new Error("cached session error"),
    },
  });
  expect(types).toEqual([
    "junction started",
    "source attached",
    "source error",
  ]);
});

test("a launch read that fails after its timeout is recorded as a late failure, as a late answer is recorded as late", async () => {
  vi.useFakeTimers();

  const { junction, links } = createJunction({
    initial: "hold",
    timeout: { initial: 1_000 },
  });

  const settled: unknown[] = [];

  junction.diagnostics.events.subscribe((event) => {
    if (event.type === "initial read settled") {
      settled.push(event.context);
    }
  });
  junction.start();
  await vi.advanceTimersByTimeAsync(1_000);
  links.initial.fail(new Error("getInitialURL rejected"));
  await vi.advanceTimersByTimeAsync(0);

  expect(settled).toEqual([
    { initial: "timed-out", late: false },
    { initial: "failed", late: true },
  ]);
  expect(junction.source("links").status.get()).toMatchObject({
    initial: "failed",
    error: { code: "INITIAL_READ_FAILED" },
  });
});

test("a launch read that lands after its timeout clears the timeout from the source's status", async () => {
  vi.useFakeTimers();

  const { junction, links } = createJunction({
    initial: "hold",
    timeout: { initial: 1_000 },
  });

  junction.start();
  await vi.advanceTimersByTimeAsync(1_000);

  expect(junction.source("links").status.get()).toMatchObject({
    initial: "timed-out",
    error: { code: "INITIAL_READ_TIMED_OUT" },
  });

  links.initial.settle({ input: { url: ANNOUNCEMENT_URL } });
  await vi.advanceTimersByTimeAsync(0);

  expect(junction.source("links").status.get()).toEqual({
    state: "attached",
    initial: "received",
    error: null,
  });
});
