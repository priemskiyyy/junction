export type Registration = {
  id: string;
  intent: string;
  disposed: boolean;
  options: {
    name: string | null;
    // A method, so that the handlers of every intent fit one registry.
    handler(payload: unknown, execution: unknown): unknown;
    // A method, for the same reason.
    match(payload: unknown): boolean;
    ready: boolean | (() => boolean);
    fallback: boolean;
    scope: string | number | null;
    timeout: number;
  };
};
