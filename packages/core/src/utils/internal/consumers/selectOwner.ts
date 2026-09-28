import type { Registration } from "src/types/internal/Registration";

type Selection =
  | { kind: "OWNER"; registration: Registration }
  | {
      kind: "WAITING";
      reason: "no-consumer" | "ambiguous-consumer" | "selection-error";
      consumers: Registration[];
    };

export const selectOwner = (
  registrations: Registration[],
  payload: unknown,
): Selection => {
  const primaries: Registration[] = [];
  const fallbacks: Registration[] = [];

  for (const registration of registrations) {
    let matches: boolean;

    // A faulty matcher holds the intent; it is never routed around.
    try {
      matches = registration.options.match(payload) === true;
    } catch {
      return {
        kind: "WAITING",
        reason: "selection-error",
        consumers: [registration],
      };
    }

    if (!matches) {
      continue;
    }

    if (registration.options.fallback) {
      fallbacks.push(registration);

      continue;
    }

    primaries.push(registration);
  }

  const candidates = primaries.length > 0 ? primaries : fallbacks;
  const [owner, ...others] = candidates;

  if (owner === undefined) {
    return { kind: "WAITING", reason: "no-consumer", consumers: [] };
  }

  if (others.length > 0) {
    return {
      kind: "WAITING",
      reason: "ambiguous-consumer",
      consumers: candidates,
    };
  }

  return { kind: "OWNER", registration: owner };
};
