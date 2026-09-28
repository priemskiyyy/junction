import type { Admission } from "src/types/Admission";
import type { SourceObservation } from "src/types/SourceObservation";

/**
 * What an attached source reports to: `push` for an actionable observation,
 * `fail` for a provider error that leaves the source attached.
 *
 * @example
 * ```ts
 * const attach = (sink: SourceSink<{ url: string }>) => {
 *   const subscription = sdk.addEventListener("url", ({ url }) => sink.push({ input: { url } }));
 *
 *   return { dispose: () => subscription.remove() };
 * };
 * ```
 */
export type SourceSink<TInput> = {
  push: (observation: SourceObservation<TInput>) => Promise<Admission>;
  fail: (error: unknown) => void;
};
