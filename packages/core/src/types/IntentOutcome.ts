/**
 * What a handler answers besides returning normally: handled, rejected for a
 * reason, or retried after a delay. The execution's `commit`, `reject` and
 * `retry` build them.
 *
 * @example
 * ```ts
 * const outcome: IntentOutcome = { status: "retry", after: 1_000 };
 * ```
 */
export type IntentOutcome =
  | { status: "handled" }
  | { status: "rejected"; reason: string }
  | { status: "retry"; after: number };
