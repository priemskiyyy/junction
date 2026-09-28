import type { DiagnosticDetail } from "src/types/internal/DiagnosticDetail";

export type DiagnosticRecord = DiagnosticDetail & {
  source: string | null;
  intent: string | null;
};
