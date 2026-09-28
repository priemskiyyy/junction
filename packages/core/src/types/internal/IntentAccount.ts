import type { IntentDefinition } from "src/types/IntentDefinition";

export type IntentAccount<TDefinition> =
  TDefinition extends IntentDefinition<never, unknown, infer TAccount>
    ? TAccount
    : never;
