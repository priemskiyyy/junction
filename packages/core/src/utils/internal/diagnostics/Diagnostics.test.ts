import { expect, test, vi } from "vitest";

import type { DiagnosticRecord } from "src/types/internal/DiagnosticRecord";
import type { JunctionDiagnosticEvent } from "src/types/JunctionDiagnosticEvent";
import type { JunctionSnapshot } from "src/types/JunctionSnapshot";
import { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";

const getSnapshot = (
  status: JunctionSnapshot["identity"]["status"],
): JunctionSnapshot => ({
  state: "started",
  identity: { status },
  storage: { state: "none" },
  sources: [],
  consumers: [],
  intents: [],
  running: null,
});

const create = () => {
  const runtime: { status: JunctionSnapshot["identity"]["status"] } = {
    status: "restoring",
  };

  const read = vi.fn(() => getSnapshot(runtime.status));
  const now = vi.fn(() => 42);
  const diagnostics = new Diagnostics({ read, now });

  return { diagnostics, runtime, read, now };
};

const accepted: DiagnosticRecord = {
  type: "intent accepted",
  source: "links",
  intent: "intent-1",
  context: null,
};

const getIgnored = (context: { reason: "no-route" }): DiagnosticRecord => ({
  type: "observation ignored",
  source: "links",
  intent: null,
  context,
});

const isDeepFrozen = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null) {
    return true;
  }

  return Object.isFrozen(value) && Object.values(value).every(isDeepFrozen);
};

test("the snapshot is read lazily and kept until something changes", () => {
  const { diagnostics, runtime, read } = create();

  expect(read).not.toHaveBeenCalled();

  const first = diagnostics.api.get();

  runtime.status = "authenticated";

  expect(diagnostics.api.get()).toBe(first);
  expect(first).toEqual(getSnapshot("restoring"));
  expect(read.mock.calls).toEqual([[]]);

  diagnostics.changed();

  expect(diagnostics.api.get()).toEqual(getSnapshot("authenticated"));
  expect(read.mock.calls).toEqual([[], []]);
});

test("several changes in one turn notify observers once", async () => {
  const { diagnostics } = create();
  const listener = vi.fn();

  diagnostics.api.subscribe(listener);

  diagnostics.changed();
  diagnostics.changed();
  diagnostics.changed();

  expect(listener).not.toHaveBeenCalled();

  await Promise.resolve();

  expect(listener.mock.calls).toEqual([[]]);
});

test("with no listener, recording an event costs a check: the clock is not read and the context is left as it was", () => {
  const { diagnostics, now } = create();
  const listener = vi.fn<(event: JunctionDiagnosticEvent) => void>();
  const context: { reason: "no-route" } = { reason: "no-route" };

  diagnostics.record(getIgnored(context));

  expect(now).not.toHaveBeenCalled();
  expect(Object.isFrozen(context)).toBe(false);

  const stop = diagnostics.api.events.subscribe(listener);

  diagnostics.record(getIgnored({ reason: "no-route" }));
  stop();
  diagnostics.record(getIgnored(context));

  expect(listener.mock.calls).toEqual([
    [
      {
        type: "observation ignored",
        source: { name: "links" },
        intent: null,
        timestamp: 42,
        context: { reason: "no-route" },
      },
    ],
  ]);
  expect(now.mock.calls).toEqual([[]]);
  expect(Object.isFrozen(context)).toBe(false);
});

test("a published event is one frozen event every listener shares", () => {
  const { diagnostics } = create();
  const first = vi.fn<(event: JunctionDiagnosticEvent) => void>();
  const second = vi.fn<(event: JunctionDiagnosticEvent) => void>();

  diagnostics.api.events.subscribe(first);
  diagnostics.api.events.subscribe(second);
  diagnostics.record({
    type: "intent waiting",
    source: null,
    intent: "intent-1",
    context: { reason: "ambiguous-consumer", consumers: 2 },
  });

  const published = first.mock.calls[0]?.[0];

  expect(published).toEqual({
    type: "intent waiting",
    source: null,
    intent: { id: "intent-1" },
    timestamp: 42,
    context: { reason: "ambiguous-consumer", consumers: 2 },
  });
  expect(second.mock.calls).toEqual([[published]]);
  expect(second.mock.calls[0]?.[0]).toBe(published);
  expect(isDeepFrozen(published)).toBe(true);
});

test("a listener that throws does not stop the others, for events or snapshots", () => {
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => {});

  const { diagnostics } = create();
  const events = vi.fn<(event: JunctionDiagnosticEvent) => void>();
  const snapshots = vi.fn();

  diagnostics.api.events.subscribe(() => {
    throw new Error("listener failed");
  });
  diagnostics.api.events.subscribe(events);
  diagnostics.api.subscribe(() => {
    throw new Error("listener failed");
  });
  diagnostics.api.subscribe(snapshots);

  diagnostics.record(accepted);
  diagnostics.dispose();

  expect(events.mock.calls.map(([event]) => event.type)).toEqual([
    "intent accepted",
    "junction disposed",
  ]);
  expect(snapshots.mock.calls).toEqual([[]]);
});

test("a listener removed by an earlier one while an event is delivered is not called", () => {
  const { diagnostics } = create();
  const removed = vi.fn();

  let stopRemoved = () => {};

  diagnostics.api.events.subscribe(() => stopRemoved());
  stopRemoved = diagnostics.api.events.subscribe(removed);

  diagnostics.record(accepted);

  expect(removed).not.toHaveBeenCalled();
});

test("disposal sends one last junction disposed event and notification, then goes quiet with the snapshot it ended with", () => {
  const { diagnostics, runtime, read } = create();
  const listener = vi.fn();
  const events = vi.fn<(event: JunctionDiagnosticEvent) => void>();

  diagnostics.api.subscribe(listener);
  diagnostics.api.events.subscribe(events);
  runtime.status = "anonymous";

  diagnostics.dispose();
  diagnostics.dispose();
  runtime.status = "authenticated";
  diagnostics.changed();
  diagnostics.record(accepted);

  expect(listener.mock.calls).toEqual([[]]);
  expect(events.mock.calls).toEqual([
    [
      {
        type: "junction disposed",
        source: null,
        intent: null,
        timestamp: 42,
        context: null,
      },
    ],
  ]);
  expect(diagnostics.api.get()).toEqual(getSnapshot("anonymous"));
  expect(diagnostics.api.get()).toBe(diagnostics.api.get());
  expect(read.mock.calls).toEqual([[]]);
});

test("subscribing after disposal is a no-op rather than a leak", async () => {
  const { diagnostics } = create();
  const listener = vi.fn();

  diagnostics.dispose();

  const stopSnapshot = diagnostics.api.subscribe(listener);
  const stopEvents = diagnostics.api.events.subscribe(listener);

  diagnostics.changed();
  diagnostics.record(accepted);
  await Promise.resolve();
  stopSnapshot();
  stopEvents();

  expect(listener).not.toHaveBeenCalled();
});

test("a record made from inside a listener reaches every listener after the event being delivered", () => {
  const { diagnostics } = create();
  const seen: string[] = [];

  diagnostics.api.events.subscribe((event) => {
    seen.push(`first: ${event.type}`);

    if (event.type === "intent accepted") {
      diagnostics.record({
        type: "attempt started",
        source: null,
        intent: "intent-1",
        context: {
          attempt: { id: "attempt-1", number: 1 },
          consumer: { id: "consumer-1" },
        },
      });
    }
  });
  diagnostics.api.events.subscribe((event) => {
    seen.push(`second: ${event.type}`);
  });

  diagnostics.record(accepted);

  expect(seen).toEqual([
    "first: intent accepted",
    "second: intent accepted",
    "first: attempt started",
    "second: attempt started",
  ]);
});

test("disposing from inside a listener still ends every listener's stream with junction disposed", () => {
  const { diagnostics } = create();
  const seen: string[] = [];

  diagnostics.api.events.subscribe((event) => {
    seen.push(`first: ${event.type}`);

    if (event.type === "intent accepted") {
      diagnostics.dispose();
    }
  });
  diagnostics.api.events.subscribe((event) => {
    seen.push(`second: ${event.type}`);

    if (event.type === "junction disposed") {
      diagnostics.record(accepted);
    }
  });

  diagnostics.record(accepted);
  diagnostics.record(accepted);

  expect(seen).toEqual([
    "first: intent accepted",
    "second: intent accepted",
    "first: junction disposed",
    "second: junction disposed",
  ]);
});
