import type { DiagnosticContexts } from "src/types/internal/DiagnosticContexts";
import type { IntentRecord } from "src/types/internal/IntentRecord";

export type RestoredInbox = {
  records: { record: IntentRecord; fingerprint: string }[];
  quarantined: {
    id: string;
    reason: DiagnosticContexts["intent quarantined"]["reason"];
    interaction: { key: string; fingerprint: string } | null;
  }[];
};
