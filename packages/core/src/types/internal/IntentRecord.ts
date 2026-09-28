import type { InboxEntry } from "src/types/InboxEntry";
import type { IntentDefinition } from "src/types/IntentDefinition";
import type { IntentProvenance } from "src/types/IntentProvenance";
import type { JsonValue } from "src/types/JsonValue";
import type { FailureCode } from "src/types/internal/FailureCode";
import type { InterruptionCode } from "src/types/internal/InterruptionCode";
import type { Waiting } from "src/types/internal/Waiting";
import type { Attempt } from "src/utils/internal/execution/Attempt";
import type { JunctionError } from "src/utils/JunctionError";

export type RecordState =
  | { state: "ADMITTED" }
  | { state: "PENDING"; waiting: Waiting }
  | { state: "LEASED"; attempt: Attempt }
  | { state: "RETRY_SCHEDULED"; at: number }
  | { state: "FAILED"; error: JunctionError<FailureCode> }
  | { state: "INTERRUPTED"; error: JunctionError<InterruptionCode> };

export type IntentRecord = {
  id: string;
  name: string;
  definition: IntentDefinition<unknown, unknown, boolean>;
  payload: JsonValue;
  size: number;
  timestamp: number;
  expiresAt: number;
  provenance: IntentProvenance;
  binding: InboxEntry<string, unknown>["binding"];
  attempts: number;
  interaction: string | null;
  current: RecordState;
  revision: number;
};
