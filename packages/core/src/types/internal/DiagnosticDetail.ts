import type { DiagnosticContexts } from "src/types/internal/DiagnosticContexts";
import type { JunctionDiagnosticType } from "src/types/JunctionDiagnosticType";

export type DiagnosticDetail = {
  [TType in JunctionDiagnosticType]: {
    type: TType;
    context: DiagnosticContexts[TType];
  };
}[JunctionDiagnosticType];
