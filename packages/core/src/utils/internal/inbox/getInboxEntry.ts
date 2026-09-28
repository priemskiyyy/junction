import type { InboxEntry } from "src/types/InboxEntry";
import type {
  IntentRecord,
  RecordState,
} from "src/types/internal/IntentRecord";
import { assertUnreachable } from "src/utils/common/assertUnreachable";

export const getInboxEntry = (
  record: IntentRecord,
  current: Exclude<RecordState, { state: "ADMITTED" }>,
): InboxEntry<string, unknown> => {
  const common = {
    id: record.id,
    name: record.name,
    payload: record.payload,
    attempts: record.attempts,
    binding: record.binding,
    timestamp: record.timestamp,
    expires: Object.freeze({ at: record.expiresAt }),
    provenance: record.provenance,
  } satisfies Partial<InboxEntry<string, unknown>>;

  if (current.state === "PENDING") {
    return Object.freeze({
      ...common,
      state: "pending",
      waiting: current.waiting,
    });
  }

  if (current.state === "LEASED") {
    return Object.freeze({
      ...common,
      state: "leased",
      attempt: Object.freeze({
        id: current.attempt.id,
        number: current.attempt.execution.attempt.number,
      }),
    });
  }

  if (current.state === "RETRY_SCHEDULED") {
    return Object.freeze({
      ...common,
      state: "retry-scheduled",
      retry: Object.freeze({ at: current.at }),
    });
  }

  if (current.state === "FAILED") {
    return Object.freeze({
      ...common,
      state: "failed",
      error: Object.freeze(current.error),
    });
  }

  if (current.state === "INTERRUPTED") {
    return Object.freeze({
      ...common,
      state: "interrupted",
      error: Object.freeze(current.error),
    });
  }

  return assertUnreachable(current);
};
