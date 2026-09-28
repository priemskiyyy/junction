import type { IntentRecord } from "src/types/internal/IntentRecord";
import type { StoredIntent } from "src/types/internal/StoredIntent";
import { assertUnreachable } from "src/utils/common/assertUnreachable";

const PENDING_STATE: StoredIntent["state"] = Object.freeze({
  state: "pending",
});

const LEASED_STATE: StoredIntent["state"] = Object.freeze({ state: "leased" });

const getStoredState = ({ current }: IntentRecord): StoredIntent["state"] => {
  if (current.state === "ADMITTED" || current.state === "PENDING") {
    return PENDING_STATE;
  }

  if (current.state === "LEASED") {
    return LEASED_STATE;
  }

  if (current.state === "RETRY_SCHEDULED") {
    return Object.freeze({
      state: "retry-scheduled",
      retry: Object.freeze({ at: current.at }),
    });
  }

  if (current.state === "FAILED") {
    return Object.freeze({
      state: "failed",
      error: Object.freeze({ code: current.error.code }),
    });
  }

  if (current.state === "INTERRUPTED") {
    return Object.freeze({
      state: "interrupted",
      error: Object.freeze({ code: current.error.code }),
    });
  }

  return assertUnreachable(current);
};

// The binding, provenance and payload are frozen already, so only what is built here is frozen here.
export const getStoredIntent = (record: IntentRecord): StoredIntent =>
  Object.freeze({
    id: record.id,
    name: record.name,
    version: record.definition.version,
    payload: record.payload,
    binding: record.binding,
    timestamp: record.timestamp,
    expires: Object.freeze({ at: record.expiresAt }),
    provenance: record.provenance,
    attempts: record.attempts,
    interaction:
      record.interaction === null
        ? null
        : Object.freeze({ key: record.interaction }),
    state: getStoredState(record),
  });
