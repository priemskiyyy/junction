import type { Registration } from "src/types/internal/Registration";
import type { Waiting } from "src/types/internal/Waiting";

export const getWaiting = (
  reason: Waiting["reason"],
  registrations: Registration[],
): Waiting => {
  const consumers = registrations.map(({ id, options }) =>
    Object.freeze({ id, name: options.name }),
  );

  Object.freeze(consumers);

  return Object.freeze({ reason, consumers });
};
