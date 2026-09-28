/**
 * What `start()` resolves with once the startup work settled: the storage's
 * restoration and each source's launch read. It never waits for a deferred
 * link.
 *
 * @example
 * ```ts
 * const report = await junction.start();
 *
 * const timedOut = report.sources.flatMap(({ name, initial }) => {
 *   if (initial !== "timed-out") {
 *     return [];
 *   }
 *
 *   return [name];
 * });
 * ```
 */
export type BootstrapReport = {
  state: "started" | "disposed";
  /** `none` without storage, `blocked` when the stored inbox could not be read or trusted. */
  storage: "none" | "ready" | "blocked";
  sources: {
    name: string;
    initial:
      "received" | "empty" | "failed" | "timed-out" | "none" | "not-attached";
  }[];
};
