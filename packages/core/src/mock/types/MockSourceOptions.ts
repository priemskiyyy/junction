import type { SourceObservation } from "src/types/SourceObservation";
import type { SourceSink } from "src/types/SourceSink";

/**
 * How a mock source behaves: its names, its launch read, and the hooks that
 * make it misbehave on purpose.
 *
 * @example
 * ```ts
 * const { source, control } = createMockSource<{ url: string }>({ initial: "hold", resource: "linking" });
 * ```
 */
export type MockSourceOptions<TInput, TNative> = {
  /** The adapter name: `mock` by default. */
  name?: string | undefined;
  native?: TNative | undefined;
  /** The native feed it claims: none by default. */
  resource?: string | null | undefined;
  /** The launch read, as an observation: left out for a source without one, `hold` to settle it from the test. */
  initial?: SourceObservation<TInput> | null | "hold" | undefined;
  /** Runs inside `attach` with the sink; pushing models a synchronous emission, throwing a failed attach. */
  onAttach?: ((sink: SourceSink<TInput>) => void) | undefined;
  /** Runs inside `dispose`; throwing or rejecting models a failed cleanup. */
  onDispose?: (() => void | Promise<void>) | undefined;
};
