import { afterEach, expect, test, vi } from "vitest";

import type { InboxSnapshot } from "src/types/InboxSnapshot";
import type { InboxStorage } from "src/types/InboxStorage";
import type { StoredIntent } from "src/types/internal/StoredIntent";
import { createDeferred } from "src/utils/common/createDeferred";
import { StorageWriter } from "src/utils/internal/storage/StorageWriter";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.useRealTimers();
});

const getStoredIntent = (version: number): StoredIntent => ({
  id: "intent-1",
  name: "openDocument",
  version,
  payload: {},
  binding: { kind: "public" },
  timestamp: 0,
  expires: { at: 600_000 },
  provenance: { kind: "dispatch" },
  attempts: 0,
  interaction: null,
  state: { state: "pending" },
});

const createStorage = () => {
  const writes: {
    snapshot: InboxSnapshot;
    operation: { id: string };
    settle: ReturnType<typeof createDeferred<void>>;
  }[] = [];

  return {
    writes,
    storage: {
      read: () => undefined,
      replace: (snapshot: InboxSnapshot, operation: { id: string }) => {
        const settle = createDeferred<void>();

        writes.push({ snapshot, operation, settle });

        return settle.promise;
      },
    },
  };
};

const createWriter = (storage: InboxStorage) => {
  const state = { version: 0 };
  const onFailure = vi.fn();
  const onRelease = vi.fn();

  const writer = new StorageWriter({
    storage,
    revision: 7,
    build: () => ({ intents: [getStoredIntent(state.version)], ledger: [] }),
    now: () => 5_000,
    onChange: () => {},
    onFailure,
    onRelease,
    timeout: 5_000,
  });

  return { writer, state, onFailure, onRelease };
};

test("one write runs at a time, and the changes made meanwhile go into one next write that carries all of them", async () => {
  const { storage, writes } = createStorage();
  const { writer, state } = createWriter(storage);
  const results: string[] = [];

  writer.changed().then((result) => results.push(`first ${result}`));
  state.version = 1;
  writer.changed().then((result) => results.push(`second ${result}`));
  state.version = 2;
  writer.changed().then((result) => results.push(`third ${result}`));

  expect(writes).toHaveLength(1);
  expect(writes[0]?.snapshot).toEqual({
    format: "junction.inbox",
    version: 1,
    revision: 8,
    timestamp: 5_000,
    intents: [getStoredIntent(0)],
    ledger: [],
  });

  writes[0]?.settle.resolve();
  await tick();

  expect(results).toEqual(["first committed"]);
  expect(writes).toHaveLength(2);
  expect(writes[1]?.snapshot).toMatchObject({
    revision: 9,
    intents: [{ version: 2 }],
  });

  writes[1]?.settle.resolve();
  await tick();

  expect(results).toEqual([
    "first committed",
    "second committed",
    "third committed",
  ]);
  expect(Object.isFrozen(writes[1]?.snapshot)).toBe(true);
  expect(Object.isFrozen(writes[1]?.snapshot.intents)).toBe(true);
});

test("a failed write answers every waiter unconfirmed and is retried only by flush, with the same operation and snapshot", async () => {
  const { storage, writes } = createStorage();
  const { writer, onFailure } = createWriter(storage);
  const results: string[] = [];

  writer.changed().then((result) => results.push(result));
  writes[0]?.settle.reject(new Error("The disk is full."));
  await tick();

  expect(results).toEqual(["unconfirmed"]);
  expect(onFailure.mock.calls).toEqual([[]]);
  expect(writer.durability()).toBe("unconfirmed");

  await tick();

  expect(writes).toHaveLength(1);

  writer.flush().then((result) => results.push(result));

  expect(writes).toHaveLength(2);
  expect(writes[1]?.operation).toEqual(writes[0]?.operation);
  expect(writes[1]?.snapshot).toBe(writes[0]?.snapshot);
  expect(writer.durability()).toBe("unconfirmed");

  writes[1]?.settle.resolve();
  await tick();

  expect(results).toEqual(["unconfirmed", "committed"]);
  expect(writer.durability()).toBe("committed");
});

test("a change after a failed write writes a newer snapshot under a new operation", async () => {
  const { storage, writes } = createStorage();
  const { writer, state } = createWriter(storage);

  writer.changed();
  writes[0]?.settle.reject(new Error("The disk is full."));
  await tick();

  state.version = 1;
  writer.changed();

  expect(writes).toHaveLength(2);
  expect(writes[1]?.operation.id).not.toBe(writes[0]?.operation.id);
  expect(writes[1]?.snapshot).toMatchObject({
    revision: 9,
    intents: [{ version: 1 }],
  });
});

test("durability is pending while a write is on its way, and committed once it landed", async () => {
  const { storage, writes } = createStorage();
  const { writer } = createWriter(storage);

  expect(writer.durability()).toBe("committed");

  writer.changed();

  expect(writer.durability()).toBe("pending");

  writes[0]?.settle.resolve();
  await tick();

  expect(writer.durability()).toBe("committed");
  await expect(writer.flush()).resolves.toBe("committed");
  expect(writes).toHaveLength(1);
});

test("a replace that throws synchronously is a failed write", async () => {
  const { storage } = createStorage();

  const writer = new StorageWriter({
    storage: {
      ...storage,
      replace: () => {
        throw new Error("The key is locked.");
      },
    },
    revision: 0,
    build: () => ({ intents: [], ledger: [] }),
    now: () => 0,
    onChange: () => {},
    onFailure: () => {},
    onRelease: () => {},
    timeout: 5_000,
  });

  await expect(writer.changed()).resolves.toBe("unconfirmed");
  expect(writer.durability()).toBe("unconfirmed");
});

test("dispose answers the waiting writes unconfirmed, clears the timer of the write in flight, and releases the storage once that write settled", async () => {
  vi.useFakeTimers();

  const { storage, writes } = createStorage();
  const { writer, onRelease } = createWriter(storage);
  const results: string[] = [];

  writer.changed().then((result) => results.push(result));
  writer.dispose();
  await vi.advanceTimersByTimeAsync(0);

  expect(results).toEqual(["unconfirmed"]);
  expect(vi.getTimerCount()).toBe(0);
  expect(onRelease).not.toHaveBeenCalled();

  writes[0]?.settle.resolve();
  await vi.advanceTimersByTimeAsync(0);

  expect(onRelease.mock.calls).toEqual([[]]);
  await expect(writer.changed()).resolves.toBe("unconfirmed");
  expect(writes).toHaveLength(1);
});

test("a write that outlives its timeout is reported failed once, whether it later commits or fails", async () => {
  vi.useFakeTimers();

  const { storage, writes } = createStorage();
  const { writer, onFailure } = createWriter(storage);
  const results: string[] = [];

  writer.changed().then((result) => results.push(result));
  await vi.advanceTimersByTimeAsync(5_000);

  expect(results).toEqual(["unconfirmed"]);
  expect(writer.durability()).toBe("unconfirmed");
  await expect(writer.flush()).resolves.toBe("unconfirmed");

  writes[0]?.settle.reject(new Error("The key is locked."));
  await vi.advanceTimersByTimeAsync(0);

  expect(onFailure.mock.calls).toEqual([[]]);
});
