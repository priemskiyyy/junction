import type { DiagnosticContexts } from "src/types/internal/DiagnosticContexts";
import type { JunctionDiagnosticType } from "src/types/JunctionDiagnosticType";

/**
 * One thing that happened inside Junction, named by a phrase from a closed
 * list such as `intent accepted` or `attempt invalidated`, with the context
 * that phrase carries. It never carries a payload, a URL, an account or a
 * provider's error. Narrowing `type` types `context`.
 *
 * @example
 * ```ts
 * junction.diagnostics.events.subscribe((event) => {
 *   if (event.type === "intent waiting") {
 *     console.debug(event.context.reason);
 *   }
 * });
 * ```
 */
export type JunctionDiagnosticEvent<
  TType extends JunctionDiagnosticType = JunctionDiagnosticType,
> = {
  [TName in TType]: {
    type: TName;
    source: { name: string } | null;
    intent: { id: string } | null;
    timestamp: number;
    /** Frozen plain detail the type names, such as a reason, a code or a count: `null` for a type that has none. */
    context: DiagnosticContexts[TName];
  };
}[TType];
