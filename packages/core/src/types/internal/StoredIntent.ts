import type { InboxEntry } from "src/types/InboxEntry";
import type { IntentProvenance } from "src/types/IntentProvenance";
import type { JsonValue } from "src/types/JsonValue";
import type { FailureCode } from "src/types/internal/FailureCode";
import type { InterruptionCode } from "src/types/internal/InterruptionCode";

export type StoredIntent = {
  id: string;
  name: string;
  version: number;
  payload: JsonValue;
  binding: InboxEntry<string, unknown>["binding"];
  timestamp: number;
  expires: { at: number };
  provenance: IntentProvenance;
  attempts: number;
  interaction: { key: string } | null;
  state:
    | { state: "pending" }
    | { state: "leased" }
    | { state: "retry-scheduled"; retry: { at: number } }
    | { state: "failed"; error: { code: FailureCode } }
    | { state: "interrupted"; error: { code: InterruptionCode } };
};
