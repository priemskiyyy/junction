import type { JunctionDiagnosticEvent } from "src/types/JunctionDiagnosticEvent";
import type { JunctionSnapshot } from "src/types/JunctionSnapshot";
import type { ObservableValue } from "src/types/ObservableValue";

/**
 * A passive view for devtools: the snapshot as an observable value, and a
 * timeline of diagnostic events that is assembled only while someone listens.
 *
 * @example
 * ```ts
 * const stop = junction.diagnostics.subscribe(() => render(junction.diagnostics.get()));
 * ```
 */
export type JunctionDiagnostics = ObservableValue<JunctionSnapshot> & {
  events: {
    subscribe: (
      listener: (event: JunctionDiagnosticEvent) => void,
    ) => () => void;
  };
};
