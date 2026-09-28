import type { IntentDefinition } from "src/types/IntentDefinition";

/**
 * What a definition's schema produces: the payload consumers receive.
 *
 * @example
 * ```ts
 * type OpenDocument = IntentPayload<(typeof intents)["openDocument"]>;
 * ```
 */
export type IntentPayload<TDefinition> =
  TDefinition extends IntentDefinition<never, infer TPayload, boolean>
    ? TPayload
    : never;
