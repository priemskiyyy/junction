import type { ValidationResult } from "src/types/ValidationResult";

/**
 * One declared intent: its schema behind `parse`, its account rule behind
 * `target`, and its lifetime. `intent()` builds one.
 *
 * @example
 * ```ts
 * const openDocument: IntentDefinition<{ documentId: string }, { documentId: string }, false> =
 *   intent(z.object({ documentId: z.string() }));
 * ```
 */
export type IntentDefinition<TInput, TPayload, TAccount extends boolean> = {
  version: number;
  expires: { in: number };
  attempts: number;
  /** Whether the intent is account-bound: it runs only for its account, signed in. */
  account: TAccount;
  // A method, so that a registry of differently typed intents stays assignable.
  parse(input: TInput): ValidationResult<TPayload>;
  // A method, for the same reason: the account the payload targets, or `undefined` for none.
  target(payload: TPayload): string | undefined;
  /** Whether accepted intents are kept in the Junction's storage. */
  persistent: boolean;
  // A method, for the same reason: validates a stored payload with `persist.schema`.
  restore(stored: unknown): ValidationResult<TPayload>;
};
