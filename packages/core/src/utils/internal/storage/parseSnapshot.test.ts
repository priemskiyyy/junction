import { expect, test } from "vitest";

import { parseSnapshot } from "src/utils/internal/storage/parseSnapshot";

const storedIntent = {
  id: "intent-1",
  name: "openDocument",
  version: 1,
  payload: { workspaceId: "w", documentId: "d" },
  binding: { kind: "bound", account: { id: "account-3" } },
  timestamp: 1_000,
  expires: { at: 601_000 },
  provenance: {
    kind: "source",
    source: { name: "links" },
    route: { id: "documentUrl" },
    initial: true,
    deferred: null,
  },
  attempts: 1,
  interaction: { key: '["dispatch","press-1"]' },
  state: { state: "leased" },
};

const ledgerEntry = {
  key: '["dispatch","press-0"]',
  fingerprint: "1355h55dgpo",
  intent: { id: "intent-0" },
  timestamp: 900,
};

const getSnapshot = (overrides: Record<string, unknown> = {}) => ({
  format: "junction.inbox",
  version: 1,
  revision: 4,
  timestamp: 2_000,
  intents: [storedIntent],
  ledger: [ledgerEntry],
  ...overrides,
});

test("no stored value is an empty inbox, whether the storage answers undefined or null as a key-value store does for a missing key", () => {
  expect(parseSnapshot(undefined)).toEqual({ kind: "EMPTY" });
  expect(parseSnapshot(null)).toEqual({ kind: "EMPTY" });
});

test("a well-formed snapshot is parsed into copies, never the stored objects themselves", () => {
  const stored = getSnapshot();
  const parsed = parseSnapshot(stored);

  expect(parsed).toEqual({
    kind: "PARSED",
    revision: 4,
    timestamp: 2_000,
    intents: [storedIntent],
    ledger: [ledgerEntry],
  });

  if (parsed.kind !== "PARSED") {
    return;
  }

  expect(parsed.intents[0]).not.toBe(storedIntent);
  expect(parsed.intents[0]?.binding).not.toBe(storedIntent.binding);
  expect(parsed.ledger[0]).not.toBe(ledgerEntry);
});

test.each<[string, unknown]>([
  ["a string", "junction.inbox"],
  ["an object of another format", { format: "silo.value" }],
  ["a missing revision", getSnapshot({ revision: undefined })],
  ["a negative revision", getSnapshot({ revision: -1 })],
  ["an infinite timestamp", getSnapshot({ timestamp: Infinity })],
  ["an older version", getSnapshot({ version: 0 })],
  ["a version that is not a number", getSnapshot({ version: "1" })],
  ["intents that are not an array", getSnapshot({ intents: {} })],
])("%s is a corrupt inbox, never an empty one", (_, value) => {
  expect(parseSnapshot(value)).toMatchObject({
    kind: "REFUSED",
    code: "STORAGE_CORRUPT",
  });
});

test("a newer version is unsupported rather than corrupt", () => {
  expect(parseSnapshot(getSnapshot({ version: 2 }))).toEqual({
    kind: "REFUSED",
    code: "STORAGE_VERSION_UNSUPPORTED",
    message: "The stored inbox has version 2; this Junction reads version 1.",
  });
});

test.each<[string, Record<string, unknown>]>([
  ["no id", { id: undefined }],
  ["a fractional version", { version: 1.5 }],
  ["a missing deadline", { expires: {} }],
  ["more attempts than any intent takes", { attempts: 11 }],
  ["an unknown binding", { binding: { kind: "shared" } }],
  ["a bound binding without an account", { binding: { kind: "bound" } }],
  [
    "a provenance without its route",
    {
      provenance: {
        kind: "source",
        source: { name: "links" },
        initial: true,
        deferred: null,
      },
    },
  ],
  ["an unknown state", { state: { state: "acknowledged" } }],
  [
    "a retry without its time",
    { state: { state: "retry-scheduled", retry: {} } },
  ],
  [
    "a failure with an interruption code",
    { state: { state: "failed", error: { code: "TIMED_OUT" } } },
  ],
  [
    "an interruption with an unknown code",
    { state: { state: "interrupted", error: { code: "CRASHED" } } },
  ],
  ["an interaction without its key", { interaction: {} }],
])("an intent with %s makes the whole inbox corrupt", (_, overrides) => {
  expect(
    parseSnapshot(
      getSnapshot({ intents: [{ ...storedIntent, ...overrides }] }),
    ),
  ).toEqual({
    kind: "REFUSED",
    code: "STORAGE_CORRUPT",
    message: "The stored inbox's intents[0] is malformed.",
  });
});

test("a malformed ledger entry, two intents with one id, or more than a Junction writes are corrupt", () => {
  expect(
    parseSnapshot(
      getSnapshot({ ledger: [{ ...ledgerEntry, intent: "intent-0" }] }),
    ),
  ).toMatchObject({
    code: "STORAGE_CORRUPT",
    message: "The stored inbox's ledger[0] is malformed.",
  });
  expect(
    parseSnapshot(getSnapshot({ intents: [storedIntent, storedIntent] })),
  ).toMatchObject({
    code: "STORAGE_CORRUPT",
    message: "The stored inbox holds two intents with one id.",
  });
  expect(
    parseSnapshot(
      getSnapshot({
        intents: Array.from({ length: 33 }, (_, index) => ({
          ...storedIntent,
          id: `intent-${index}`,
        })),
      }),
    ),
  ).toMatchObject({
    code: "STORAGE_CORRUPT",
    message: "The stored inbox holds more than a Junction ever writes.",
  });
});
