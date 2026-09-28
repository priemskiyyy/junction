import { expect, test } from "vitest";

import { InteractionLedger } from "src/utils/internal/inbox/InteractionLedger";

test("a reserved key is found with the intent it names until it is evicted", () => {
  const ledger = new InteractionLedger();

  ledger.reserve("press-1", {
    intent: "intent-1",
    fingerprint: "a",
    persistent: false,
  });

  expect(ledger.find("press-1", 0)).toEqual({
    intent: "intent-1",
    fingerprint: "a",
    persistent: false,
  });
  expect(ledger.find("press-2", 0)).toBe(undefined);
});

test("a settled key keeps deduplicating for a day, then is forgotten", () => {
  const ledger = new InteractionLedger();

  ledger.reserve("press-1", {
    intent: "intent-1",
    fingerprint: "a",
    persistent: false,
  });
  ledger.settle("press-1", 0);
  ledger.reserve("press-2", {
    intent: "intent-2",
    fingerprint: "b",
    persistent: false,
  });
  ledger.settle("press-2", 86_399_999);

  expect(ledger.find("press-1", 86_399_999)).toEqual({
    intent: "intent-1",
    fingerprint: "a",
    persistent: false,
  });

  ledger.reserve("press-3", {
    intent: "intent-3",
    fingerprint: "c",
    persistent: false,
  });
  ledger.settle("press-3", 86_400_000);

  expect(ledger.find("press-1", 86_400_000)).toBe(undefined);
  expect(ledger.find("press-2", 86_400_000)).toEqual({
    intent: "intent-2",
    fingerprint: "b",
    persistent: false,
  });
});

test("past 1024 settled keys the oldest go first, and an open reservation is never evicted", () => {
  const ledger = new InteractionLedger();

  ledger.reserve("open", {
    intent: "intent-open",
    fingerprint: "o",
    persistent: false,
  });

  for (let index = 0; index <= 1_024; index += 1) {
    ledger.reserve(`press-${index}`, {
      intent: `intent-${index}`,
      fingerprint: "p",
      persistent: false,
    });
    ledger.settle(`press-${index}`, 1_000);
  }

  expect(ledger.find("press-0", 1_000)).toBe(undefined);
  expect(ledger.find("press-1", 1_000)).toEqual({
    intent: "intent-1",
    fingerprint: "p",
    persistent: false,
  });
  expect(ledger.find("press-1024", 1_000)).toEqual({
    intent: "intent-1024",
    fingerprint: "p",
    persistent: false,
  });
  expect(ledger.find("open", 1_000)).toEqual({
    intent: "intent-open",
    fingerprint: "o",
    persistent: false,
  });
});

test("only the settled entries of persistent intents are stored, and restored ones deduplicate until they age out", () => {
  const ledger = new InteractionLedger();

  ledger.reserve("press-1", {
    intent: "intent-1",
    fingerprint: "a",
    persistent: true,
  });
  ledger.reserve("press-2", {
    intent: "intent-2",
    fingerprint: "b",
    persistent: false,
  });
  ledger.reserve("press-3", {
    intent: "intent-3",
    fingerprint: "c",
    persistent: true,
  });
  ledger.settle("press-1", 1_000);
  ledger.settle("press-2", 2_000);

  expect(ledger.getStoredEntries(2_000)).toEqual([
    {
      key: "press-1",
      fingerprint: "a",
      intent: { id: "intent-1" },
      timestamp: 1_000,
    },
  ]);

  const restored = new InteractionLedger();

  restored.restore(
    [
      {
        key: "press-1",
        fingerprint: "a",
        intent: { id: "intent-1" },
        timestamp: 1_000,
      },
      {
        key: "press-4",
        fingerprint: "d",
        intent: { id: "intent-4" },
        timestamp: 50_000,
      },
    ],
    86_401_000,
  );

  expect(restored.find("press-1", 86_401_000)).toBe(undefined);
  expect(restored.find("press-4", 86_401_000)).toEqual({
    intent: "intent-4",
    fingerprint: "d",
    persistent: true,
  });
  expect(restored.getStoredEntries(86_401_000)).toEqual([
    {
      key: "press-4",
      fingerprint: "d",
      intent: { id: "intent-4" },
      timestamp: 50_000,
    },
  ]);
});

test("a settled key is forgotten once its day has passed, when it is next looked up or stored, with no other settle", () => {
  const ledger = new InteractionLedger();

  ledger.reserve("press-1", {
    intent: "intent-1",
    fingerprint: "a",
    persistent: true,
  });
  ledger.settle("press-1", 0);

  expect(ledger.getStoredEntries(86_399_999)).toHaveLength(1);
  expect(ledger.getStoredEntries(86_400_000)).toEqual([]);
  expect(ledger.find("press-1", 86_400_000)).toBe(undefined);
});
