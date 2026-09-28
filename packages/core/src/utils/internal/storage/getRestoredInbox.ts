import type { IntentDefinition } from "src/types/IntentDefinition";
import type { IntentRecord } from "src/types/internal/IntentRecord";
import type { RestorableIntent } from "src/types/internal/RestorableIntent";
import type { RestoredInbox } from "src/types/internal/RestoredInbox";
import { assertUnreachable } from "src/utils/common/assertUnreachable";
import { FAILURE_MESSAGES } from "src/utils/constants/failures";
import { INTERRUPTION_MESSAGES } from "src/utils/constants/interruptions";
import { PAYLOAD_SIZE } from "src/utils/constants/limits";
import { getFingerprint } from "src/utils/internal/inbox/getFingerprint";
import { getCanonicalValue } from "src/utils/internal/payload/getCanonicalValue";
import { JunctionError } from "src/utils/JunctionError";

type Quarantine = RestoredInbox["quarantined"][number]["reason"];

const getRestoredState = ({
  state,
}: RestorableIntent): IntentRecord["current"] => {
  if (state.state === "pending") {
    return { state: "ADMITTED" };
  }

  // An effect may have happened before the process ended, so the attempt is never taken as unhandled.
  if (state.state === "leased") {
    return {
      state: "INTERRUPTED",
      error: new JunctionError({
        code: "PROCESS_RESTARTED",
        message: INTERRUPTION_MESSAGES.PROCESS_RESTARTED,
      }),
    };
  }

  if (state.state === "retry-scheduled") {
    return { state: "RETRY_SCHEDULED", at: state.retry.at };
  }

  if (state.state === "failed") {
    return {
      state: "FAILED",
      error: new JunctionError({
        code: state.error.code,
        message: FAILURE_MESSAGES[state.error.code],
      }),
    };
  }

  if (state.state === "interrupted") {
    return {
      state: "INTERRUPTED",
      error: new JunctionError({
        code: state.error.code,
        message: INTERRUPTION_MESSAGES[state.error.code],
      }),
    };
  }

  return assertUnreachable(state);
};

const getQuarantine = (
  stored: RestorableIntent,
  definition: IntentDefinition<unknown, unknown, boolean> | undefined,
): Quarantine | null => {
  if (definition === undefined) {
    return "unknown-intent";
  }

  if (!definition.persistent) {
    return "not-persistent";
  }

  if (definition.version !== stored.version) {
    return "unsupported-version";
  }

  if (definition.account === (stored.binding.kind === "public")) {
    return "binding-mismatch";
  }

  return null;
};

const getInteraction = ({ name, payload, interaction }: RestorableIntent) => {
  if (interaction === null) {
    return null;
  }

  const canonical = getCanonicalValue(payload, PAYLOAD_SIZE);

  // A payload that cannot be copied is never replayed as a duplicate either: its tombstone conflicts with any.
  return {
    key: interaction.key,
    fingerprint:
      canonical.status === "valid" ? getFingerprint(name, canonical.text) : "",
  };
};

const getRecord = (
  stored: RestorableIntent,
  definition: IntentDefinition<unknown, unknown, boolean>,
): RestoredInbox["records"][number] | null => {
  let restored: ReturnType<typeof definition.restore>;

  // A definition written by hand can throw where intent()'s never does.
  try {
    restored = definition.restore(stored.payload);
  } catch {
    return null;
  }

  if (restored.status === "invalid") {
    return null;
  }

  const canonical = getCanonicalValue(restored.value, PAYLOAD_SIZE);

  if (canonical.status === "invalid") {
    return null;
  }

  const { provenance, binding } = stored;

  return {
    record: {
      id: stored.id,
      name: stored.name,
      definition,
      payload: canonical.value,
      size: canonical.size,
      timestamp: stored.timestamp,
      expiresAt: stored.expires.at,
      provenance:
        provenance.kind === "dispatch"
          ? Object.freeze({ kind: "dispatch" })
          : Object.freeze({
              ...provenance,
              source: Object.freeze(provenance.source),
              route: Object.freeze(provenance.route),
            }),
      binding:
        binding.kind === "bound"
          ? Object.freeze({
              kind: "bound",
              account: Object.freeze(binding.account),
            })
          : Object.freeze(binding),
      attempts: stored.attempts,
      interaction: stored.interaction === null ? null : stored.interaction.key,
      current: getRestoredState(stored),
      revision: 0,
    },
    fingerprint: getFingerprint(stored.name, canonical.text),
  };
};

export const getRestoredInbox = (
  intents: RestorableIntent[],
  definitions: Map<string, IntentDefinition<unknown, unknown, boolean>>,
): RestoredInbox => {
  const restored: RestoredInbox = { records: [], quarantined: [] };

  for (const stored of intents) {
    const definition = definitions.get(stored.name);
    const quarantine = getQuarantine(stored, definition);

    const record =
      quarantine === null && definition !== undefined
        ? getRecord(stored, definition)
        : null;

    if (record !== null) {
      restored.records.push(record);

      continue;
    }

    restored.quarantined.push({
      id: stored.id,
      reason: quarantine ?? "invalid-payload",
      interaction: getInteraction(stored),
    });
  }

  return restored;
};
