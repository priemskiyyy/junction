import type { IntentDefinition } from "src/types/IntentDefinition";
import type { PreparedIntent } from "src/types/internal/PreparedIntent";
import { IDENTIFIER_LENGTH, PAYLOAD_SIZE } from "src/utils/constants/limits";
import { getCanonicalValue } from "src/utils/internal/payload/getCanonicalValue";

const reject = (message: string): PreparedIntent => ({
  kind: "REJECTED",
  reason: "invalid-payload",
  issues: [{ path: "", message }],
});

export const prepareIntent = (
  definition: IntentDefinition<unknown, unknown, boolean>,
  candidate: unknown,
): PreparedIntent => {
  let parsed: ReturnType<typeof definition.parse>;

  // A definition written by hand can throw where intent()'s never does.
  try {
    parsed = definition.parse(candidate);
  } catch {
    return reject("The definition threw while validating.");
  }

  if (parsed.status === "invalid") {
    return {
      kind: "REJECTED",
      reason: "invalid-payload",
      issues: parsed.issues,
    };
  }

  const canonical = getCanonicalValue(parsed.value, PAYLOAD_SIZE);

  if (canonical.status === "invalid") {
    return {
      kind: "REJECTED",
      reason: "invalid-payload",
      issues: canonical.issues,
    };
  }

  // No type can say that persist.schema gives its own output back, so a payload it would refuse or change at restoration is refused now.
  if (definition.persistent) {
    let restored: ReturnType<typeof definition.restore>;

    try {
      restored = definition.restore(canonical.value);
    } catch {
      return reject("persist.schema threw while validating.");
    }

    if (restored.status === "invalid") {
      return reject(
        "persist.schema refuses the payload this intent would store, so it could never be restored.",
      );
    }

    const restoredPayload = getCanonicalValue(restored.value, PAYLOAD_SIZE);

    if (
      restoredPayload.status === "invalid" ||
      restoredPayload.text !== canonical.text
    ) {
      return reject(
        "persist.schema restores another payload than the one this intent would store.",
      );
    }
  }

  let target: unknown;

  try {
    target = definition.account
      ? definition.target(canonical.value)
      : undefined;
  } catch {
    return reject("The account selector threw.");
  }

  // An account id comes from the payload, so it is checked as any value from outside.
  if (
    target !== undefined &&
    (typeof target !== "string" ||
      target.length === 0 ||
      target.length > IDENTIFIER_LENGTH)
  ) {
    return reject(
      `An account id is a string of 1 to ${IDENTIFIER_LENGTH} characters.`,
    );
  }

  return {
    kind: "PREPARED",
    definition,
    payload: canonical.value,
    text: canonical.text,
    size: canonical.size,
    target,
  };
};
