import type { IntentDefinition } from "src/types/IntentDefinition";
import type { Issue } from "src/types/Issue";
import type { JsonValue } from "src/types/JsonValue";

export type PreparedIntent =
  | {
      kind: "PREPARED";
      definition: IntentDefinition<unknown, unknown, boolean>;
      payload: JsonValue;
      text: string;
      size: number;
      target: string | undefined;
    }
  | { kind: "REJECTED"; reason: "invalid-payload"; issues: Issue[] };
