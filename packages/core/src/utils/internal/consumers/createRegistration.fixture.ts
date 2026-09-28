import type { Registration } from "src/types/internal/Registration";

export const createRegistration = (
  id: string,
  options: Partial<Registration["options"]> = {},
): Registration => ({
  id,
  intent: "openDocument",
  disposed: false,
  options: {
    name: null,
    handler: () => {},
    match: () => true,
    ready: true,
    fallback: false,
    scope: null,
    timeout: 30_000,
    ...options,
  },
});
