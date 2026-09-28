import type { StandardSchema } from "src/types/StandardSchema";

/**
 * How long an intent may wait, how many attempts it may take, whether it is
 * account-bound and whether it persists. Every field is optional.
 *
 * @example
 * ```ts
 * const options = { account: ({ accountId }) => accountId, expires: { in: 60_000 } } satisfies IntentOptions<{ accountId?: string }>;
 * ```
 */
export type IntentOptions<TPayload> = {
  /** Makes the intent account-bound: to the account a function names from the payload, or else to the one signed in when it is accepted, or at its first attempt while nobody is. */
  account?: true | ((payload: TPayload) => string | undefined);
  /** How long an accepted intent may wait, from its receipt: 10 minutes by default. */
  expires?: { in: number } | undefined;
  /** How many attempts it may take: 3 by default, from 1 to 10. */
  attempts?: number | undefined;
  /** The payload's version: a stored intent of another version is quarantined when it is restored. 1 by default. */
  version?: number | undefined;
  /** Keeps accepted intents in the Junction's storage across restarts; `schema` validates a stored payload when it is restored. */
  persist?: { schema: StandardSchema<unknown, TPayload> } | undefined;
};
