import type { IntentDefinition } from "src/types/IntentDefinition";

/**
 * What a definition's schema accepts: the type `dispatch` takes and a route's
 * `payload` aims at.
 *
 * @example
 * ```ts
 * type OpenDocumentInput = IntentInput<(typeof intents)["openDocument"]>;
 * ```
 */
export type IntentInput<TDefinition> =
  TDefinition extends IntentDefinition<infer TInput, unknown, boolean>
    ? TInput
    : never;
