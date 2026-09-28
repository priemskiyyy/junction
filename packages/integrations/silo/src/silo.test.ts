import type { InboxSnapshot } from "@priemskiyyy/junction";
import { expect, test } from "vitest";

import {
  createFakeSiloBackend,
  createFakeSiloValue,
} from "src/fakeSiloValue.fixture";
import { silo } from "src/silo";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const snapshot: InboxSnapshot = {
  format: "junction.inbox",
  version: 1,
  revision: 3,
  timestamp: 1_000,
  intents: [],
  ledger: [],
};

test("read waits for the value to hydrate, then answers the stored snapshot", async () => {
  const backend = createFakeSiloBackend();

  backend.stored = snapshot;

  const fake = createFakeSiloValue({ backend, hydration: "hold" });
  const settled: unknown[] = [];

  Promise.resolve(silo({ value: fake.value }).read()).then((value) =>
    settled.push(value),
  );
  await tick();

  expect(settled).toEqual([]);

  fake.hydrate();
  await tick();

  expect(settled).toEqual([snapshot]);
});

test.each([undefined, null])(
  "nothing stored reads as no snapshot, with a fallback of %s",
  async (fallback) => {
    const fake = createFakeSiloValue({
      backend: createFakeSiloBackend(),
      ...(fallback === null ? { fallback } : {}),
    });

    await expect(silo({ value: fake.value }).read()).resolves.toBe(undefined);
  },
);

test("a value whose hydration failed is a failed read, never an empty inbox", async () => {
  const backend = createFakeSiloBackend();

  backend.corrupt = true;

  const fake = createFakeSiloValue({ backend });

  await expect(silo({ value: fake.value }).read()).rejects.toThrow(
    "Silo could not decode the stored value.",
  );
});

test("replace sets the whole snapshot and resolves once it is durable", async () => {
  const backend = createFakeSiloBackend();
  const fake = createFakeSiloValue({ backend });
  const storage = silo({ value: fake.value });

  await storage.read();
  await storage.replace(snapshot, { id: "operation-1" });

  expect(fake.sets).toEqual([snapshot]);
  expect(backend.stored).toBe(snapshot);
});

test("a write the adapter refuses rejects replace, and a later accepted write resolves again", async () => {
  const backend = createFakeSiloBackend();
  const fake = createFakeSiloValue({ backend });
  const storage = silo({ value: fake.value });
  const refusal = new Error("The disk is full.");

  await storage.read();
  backend.refusal = refusal;

  await expect(storage.replace(snapshot, { id: "operation-1" })).rejects.toBe(
    refusal,
  );

  backend.refusal = null;

  await expect(
    storage.replace({ ...snapshot, revision: 4 }, { id: "operation-2" }),
  ).resolves.toBe(undefined);
  expect(backend.stored).toMatchObject({ revision: 4 });
});

test("the storage never disposes the value the application owns", () => {
  const storage = silo({
    value: createFakeSiloValue({ backend: createFakeSiloBackend() }).value,
  });

  expect(storage.dispose).toBe(undefined);
});
