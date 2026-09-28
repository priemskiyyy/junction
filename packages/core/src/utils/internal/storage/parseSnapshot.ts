import type { FailureCode } from "src/types/internal/FailureCode";
import type { InterruptionCode } from "src/types/internal/InterruptionCode";
import type { RestorableIntent } from "src/types/internal/RestorableIntent";
import type { SnapshotParse } from "src/types/internal/SnapshotParse";
import type { StoredLedgerEntry } from "src/types/internal/StoredLedgerEntry";
import { isPlainObject } from "src/utils/common/isPlainObject";
import { MAX_ATTEMPTS } from "src/utils/constants/defaults";
import { FAILURE_MESSAGES } from "src/utils/constants/failures";
import { INTERRUPTION_MESSAGES } from "src/utils/constants/interruptions";
import { INBOX_CAPACITY, LEDGER_CAPACITY } from "src/utils/constants/limits";
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION } from "src/utils/constants/storage";

const EMPTY: SnapshotParse = Object.freeze({ kind: "EMPTY" });

const refuse = (message: string): SnapshotParse => ({
  kind: "REFUSED",
  code: "STORAGE_CORRUPT",
  message,
});

const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isFailureCode = (code: string): code is FailureCode =>
  Object.hasOwn(FAILURE_MESSAGES, code);

const isInterruptionCode = (code: string): code is InterruptionCode =>
  Object.hasOwn(INTERRUPTION_MESSAGES, code);

const parseBinding = (value: unknown): RestorableIntent["binding"] | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (value.kind === "public" || value.kind === "unbound") {
    return { kind: value.kind };
  }

  if (
    value.kind === "bound" &&
    isPlainObject(value.account) &&
    typeof value.account.id === "string"
  ) {
    return { kind: "bound", account: { id: value.account.id } };
  }

  return null;
};

const parseProvenance = (
  value: unknown,
): RestorableIntent["provenance"] | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (value.kind === "dispatch") {
    return { kind: "dispatch" };
  }

  if (
    value.kind !== "source" ||
    !isPlainObject(value.source) ||
    typeof value.source.name !== "string" ||
    !isPlainObject(value.route) ||
    typeof value.route.id !== "string" ||
    typeof value.initial !== "boolean" ||
    (value.deferred !== null && typeof value.deferred !== "boolean")
  ) {
    return null;
  }

  return {
    kind: "source",
    source: { name: value.source.name },
    route: { id: value.route.id },
    initial: value.initial,
    deferred: value.deferred,
  };
};

const parseState = (value: unknown): RestorableIntent["state"] | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (value.state === "pending" || value.state === "leased") {
    return { state: value.state };
  }

  if (value.state === "retry-scheduled") {
    if (!isPlainObject(value.retry) || !isTime(value.retry.at)) {
      return null;
    }

    return { state: "retry-scheduled", retry: { at: value.retry.at } };
  }

  if (!isPlainObject(value.error) || typeof value.error.code !== "string") {
    return null;
  }

  const { code } = value.error;

  if (value.state === "failed" && isFailureCode(code)) {
    return { state: "failed", error: { code } };
  }

  if (value.state === "interrupted" && isInterruptionCode(code)) {
    return { state: "interrupted", error: { code } };
  }

  return null;
};

const parseInteraction = (
  value: unknown,
): { interaction: RestorableIntent["interaction"] } | null => {
  if (value === null) {
    return { interaction: null };
  }

  if (!isPlainObject(value) || typeof value.key !== "string") {
    return null;
  }

  return { interaction: { key: value.key } };
};

const parseIntent = (value: unknown): RestorableIntent | null => {
  if (
    !isPlainObject(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !isCount(value.version) ||
    !isTime(value.timestamp) ||
    !isPlainObject(value.expires) ||
    !isTime(value.expires.at) ||
    !isCount(value.attempts) ||
    value.attempts > MAX_ATTEMPTS
  ) {
    return null;
  }

  const binding = parseBinding(value.binding);
  const provenance = parseProvenance(value.provenance);
  const state = parseState(value.state);
  const interaction = parseInteraction(value.interaction);

  if (
    binding === null ||
    provenance === null ||
    state === null ||
    interaction === null
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    version: value.version,
    payload: value.payload,
    binding,
    timestamp: value.timestamp,
    expires: { at: value.expires.at },
    provenance,
    attempts: value.attempts,
    interaction: interaction.interaction,
    state,
  };
};

const parseLedgerEntry = (value: unknown): StoredLedgerEntry | null => {
  if (
    !isPlainObject(value) ||
    typeof value.key !== "string" ||
    typeof value.fingerprint !== "string" ||
    !isPlainObject(value.intent) ||
    typeof value.intent.id !== "string" ||
    !isTime(value.timestamp)
  ) {
    return null;
  }

  return {
    key: value.key,
    fingerprint: value.fingerprint,
    intent: { id: value.intent.id },
    timestamp: value.timestamp,
  };
};

// The stored value comes from outside, so every field is checked and copied before any of it is trusted.
const parseSnapshotValue = (value: unknown): SnapshotParse => {
  // A key-value store answers null for a missing key, and Junction never writes null.
  if (value === undefined || value === null) {
    return EMPTY;
  }

  if (!isPlainObject(value) || value.format !== SNAPSHOT_FORMAT) {
    return refuse("The stored value is not a Junction inbox.");
  }

  if (typeof value.version === "number" && value.version > SNAPSHOT_VERSION) {
    return {
      kind: "REFUSED",
      code: "STORAGE_VERSION_UNSUPPORTED",
      message: `The stored inbox has version ${value.version}; this Junction reads version ${SNAPSHOT_VERSION}.`,
    };
  }

  if (
    value.version !== SNAPSHOT_VERSION ||
    !isCount(value.revision) ||
    !isTime(value.timestamp) ||
    !Array.isArray(value.intents) ||
    !Array.isArray(value.ledger)
  ) {
    return refuse("The stored inbox's envelope is malformed.");
  }

  const stored: unknown[] = value.intents;
  const settled: unknown[] = value.ledger;

  if (stored.length > INBOX_CAPACITY || settled.length > LEDGER_CAPACITY) {
    return refuse("The stored inbox holds more than a Junction ever writes.");
  }

  const intents: RestorableIntent[] = [];

  for (const [index, entry] of stored.entries()) {
    const intent = parseIntent(entry);

    if (intent === null) {
      return refuse(`The stored inbox's intents[${index}] is malformed.`);
    }

    intents.push(intent);
  }

  if (new Set(intents.map(({ id }) => id)).size !== intents.length) {
    return refuse("The stored inbox holds two intents with one id.");
  }

  const ledger: StoredLedgerEntry[] = [];

  for (const [index, entry] of settled.entries()) {
    const parsed = parseLedgerEntry(entry);

    if (parsed === null) {
      return refuse(`The stored inbox's ledger[${index}] is malformed.`);
    }

    ledger.push(parsed);
  }

  return {
    kind: "PARSED",
    revision: value.revision,
    timestamp: value.timestamp,
    intents,
    ledger,
  };
};

// A storage outside the types can answer an object whose reads throw, which is as unreadable as a corrupt one.
export const parseSnapshot = (value: unknown): SnapshotParse => {
  try {
    return parseSnapshotValue(value);
  } catch {
    return refuse("The stored inbox could not be read.");
  }
};
