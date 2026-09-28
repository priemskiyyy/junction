import type { IntentProvenance } from "src/types/IntentProvenance";
import type { PreparedIntent } from "src/types/internal/PreparedIntent";

export type Candidate = {
  name: string;
  prepared: Extract<PreparedIntent, { kind: "PREPARED" }>;
  provenance: IntentProvenance;
  timestamp: number;
  interaction: string | null;
};
