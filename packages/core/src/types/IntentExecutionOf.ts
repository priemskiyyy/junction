import type { IntentExecution } from "src/types/IntentExecution";
import type { IntentAccount } from "src/types/internal/IntentAccount";

/**
 * The execution a handler of one intent of a registry receives, with its
 * account narrowed for an account-bound intent.
 *
 * @example
 * ```ts
 * type OpenDocumentExecution = IntentExecutionOf<typeof intents, "openDocument">;
 * ```
 */
export type IntentExecutionOf<
  TIntents,
  TName extends keyof TIntents & string,
> = IntentExecution<TName, IntentAccount<TIntents[TName]>>;
