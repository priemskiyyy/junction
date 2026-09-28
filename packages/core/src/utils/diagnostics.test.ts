import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";

import { createMockSource } from "src/mock/createMockSource";
import { createMockStorage } from "src/mock/createMockStorage";
import { createDeferred } from "src/utils/common/createDeferred";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";
import {
  ANNOUNCEMENT_URL,
  DOCUMENT_URL,
  authenticated,
  createIdentity,
  createJunction,
  tick,
} from "src/utils/junction.fixture";

afterEach(() => {
  vi.useRealTimers();
});

test("no diagnostic event or snapshot ever carries a payload, a URL, a query value or an account", async () => {
  const { junction, links, identity } = createJunction();
  const seen: unknown[] = [];

  junction.diagnostics.events.subscribe((event) => seen.push(event));
  junction.diagnostics.subscribe(() => seen.push(junction.diagnostics.get()));
  junction.start();
  junction.subscribe("openDocument", (_payload, { commit }) =>
    commit(() => {}),
  );
  await links.emit({
    input: { url: `${DOCUMENT_URL}?account=secret-account&token=t0k3n` },
  });
  await links.emit({
    input: { url: "https://app.example.com/documents/%2e%2e?token=t0k3n" },
  });
  identity.set({ status: "anonymous" });
  await tick();

  const text = JSON.stringify(seen);

  expect(seen.length).toBeGreaterThan(0);
  expect(text).not.toContain("t0k3n");
  expect(text).not.toContain("secret-account");
  expect(text).not.toContain("document-42");
  expect(text).not.toContain("app.example.com");
});

const createFailingJunction = async () => {
  const links = createMockSource<{ url: string }>();
  const storage = createMockStorage({ read: "hold" });

  const junction = new Junction({
    intents: {
      showAnnouncement: intent(z.object({ announcementId: z.string() })),
    },
    sources: { links: links.source },
    storage: storage.storage,
  });

  junction.start();
  links.control.fail(new Error("token=t0k3n"));
  storage.control.read.fail(new Error('{"payload":"secret"}'));
  await tick();

  return junction;
};

test("the snapshot carries no provider error or stored text: its statuses keep each error's code and message, and only the statuses themselves keep the cause", async () => {
  const junction = await createFailingJunction();
  const { sources, storage } = junction.diagnostics.get();

  expect(sources[0]?.status).toMatchObject({
    state: "attached",
    error: { code: "SOURCE_ERROR", message: "The provider reported an error." },
  });
  expect(sources[0]?.status).not.toHaveProperty("error.cause");
  expect(storage).toMatchObject({
    state: "blocked",
    error: { code: "STORAGE_READ_FAILED" },
  });
  expect(storage).not.toHaveProperty("error.cause");
  expect(junction.source("links").status.get()).toHaveProperty(
    "error.cause",
    new Error("token=t0k3n"),
  );
  expect(junction.storage.status.get()).toHaveProperty(
    "error.cause",
    new Error('{"payload":"secret"}'),
  );
});

test("the errors a source's and the storage's status publish are frozen", async () => {
  const junction = await createFailingJunction();
  const source = junction.source("links").status.get();
  const storage = junction.storage.status.get();

  if (source.state !== "attached" || storage.state !== "blocked") {
    throw new Error("The source or the storage did not fail.");
  }

  expect(Object.isFrozen(source.error)).toBe(true);
  expect(Object.isFrozen(storage.error)).toBe(true);
});

test("the snapshot names the lifecycle, the identity, every source, consumer and intent, and the running attempt", async () => {
  const { junction } = createJunction();

  junction.start();
  junction.subscribe("showAnnouncement", () => new Promise(() => {}), {
    name: "announcements",
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  expect(junction.diagnostics.get()).toEqual({
    state: "started",
    identity: { status: "authenticated" },
    storage: { state: "none" },
    sources: [
      {
        name: "links",
        adapter: { name: "mock" },
        status: { state: "attached", initial: "none", error: null },
      },
    ],
    consumers: [
      {
        id: expect.any(String),
        name: "announcements",
        intent: { name: "showAnnouncement" },
        fallback: false,
      },
    ],
    intents: [
      {
        id: expect.any(String),
        name: "showAnnouncement",
        state: "leased",
        attempts: 1,
        waiting: null,
      },
      {
        id: expect.any(String),
        name: "openDocument",
        state: "pending",
        attempts: 0,
        waiting: "no-consumer",
      },
    ],
    running: {
      intent: { id: expect.any(String) },
      attempt: { id: expect.any(String) },
      blocked: false,
    },
  });
});

test("the snapshot is read lazily and observers are told once per turn", async () => {
  const { junction } = createJunction();
  const listener = vi.fn();

  junction.diagnostics.subscribe(listener);
  junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await junction.dispatch("showAnnouncement", { announcementId: "a-2" });
  await tick();

  expect(listener.mock.calls.length).toBeLessThanOrEqual(3);
  expect(junction.diagnostics.get()).toBe(junction.diagnostics.get());
});

test("an update that keeps the consumer's name and fallback tells no observer, so a panel that renders consumers cannot loop", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();
  const listener = vi.fn();

  junction.start();

  const registration = junction.subscribe("showAnnouncement", handler, {
    name: "announcements",
  });

  await tick();
  junction.diagnostics.subscribe(listener);

  registration.update(handler, { name: "announcements", ready: false });
  registration.update(vi.fn(), { name: "announcements", scope: "editor-1" });
  await tick();

  expect(listener).not.toHaveBeenCalled();

  registration.update(handler, { name: "announcements", fallback: true });
  await tick();

  expect(listener.mock.calls).toEqual([[]]);
  expect(junction.diagnostics.get().consumers).toEqual([
    {
      id: registration.id,
      name: "announcements",
      intent: { name: "showAnnouncement" },
      fallback: true,
    },
  ]);
});

test("the snapshot shows an attempt blocked past its timeout, even one already interrupted", async () => {
  vi.useFakeTimers();

  const { junction } = createJunction({ timeout: { execution: 1_000 } });
  const held = createDeferred();

  junction.start();

  const registration = junction.subscribe(
    "showAnnouncement",
    () => held.promise,
  );

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(0);
  registration.dispose();

  const notified = vi.fn();

  junction.diagnostics.subscribe(notified);
  await vi.advanceTimersByTimeAsync(1_000);

  expect(junction.diagnostics.get().running).toMatchObject({ blocked: true });
  expect(notified.mock.calls).toEqual([[]]);
});

test("a sign-in while the storage restores shows in the snapshot at once", async () => {
  const Document = z.object({ documentId: z.string() });
  const store = createIdentity({ status: "anonymous" });

  const junction = new Junction({
    intents: {
      openDocument: intent(Document, { persist: { schema: Document } }),
    },
    identity: store.identity,
    storage: createMockStorage({ read: "hold" }).storage,
  });

  junction.start();
  junction.diagnostics.get();

  const notified = vi.fn();

  junction.diagnostics.subscribe(notified);
  store.set(authenticated("ada"));
  await tick();

  expect(junction.diagnostics.get().identity).toEqual({
    status: "authenticated",
  });
  expect(notified.mock.calls).toEqual([[]]);
});

test("an intent that ends before any turn published it leaves a snapshot read in between", async () => {
  let now = 0;

  const { junction } = createJunction({ now: () => now });

  junction.start();
  junction.dispatch("showAnnouncement", { announcementId: "a-1" });

  expect(junction.diagnostics.get().intents).toMatchObject([
    { name: "showAnnouncement", state: "pending" },
  ]);

  now = 11 * 60_000;
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(junction.diagnostics.get().intents).toEqual([]);
});

test("observing diagnostics events never moves Junction's time, so a devtools panel cannot expire an intent", async () => {
  let wall = 0;

  const { junction, links } = createJunction({ now: () => wall });
  const handler = vi.fn();

  junction.diagnostics.events.subscribe(() => {});
  junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  wall = 700_000;
  links.fail(new Error("A provider error while the wall clock ran ahead."));
  wall = 0;
  junction.subscribe("showAnnouncement", handler);
  await tick();

  expect(handler).toHaveBeenCalledTimes(1);
});

test("the snapshot keeps its reference when nothing it shows changed: a duplicate, a switch between signed-in accounts, or a cancel of a running intent", async () => {
  const { junction, links, identity } = createJunction();
  const held = createDeferred<void>();

  const press = { key: "press-1", scope: "installation" } satisfies {
    key: string;
    scope: "installation";
  };

  junction.start();
  junction.subscribe("showAnnouncement", () => held.promise);
  await links.emit({ input: { url: ANNOUNCEMENT_URL }, interaction: press });
  await tick();

  const before = junction.diagnostics.get();
  const [entry] = junction.inbox.get();

  await links.emit({ input: { url: ANNOUNCEMENT_URL }, interaction: press });
  identity.set(authenticated("account-4"));
  await junction.cancel(entry?.id ?? "");
  await tick();

  expect(junction.diagnostics.get()).toBe(before);
  held.resolve();
});
