/**
 * Where an intent came from: a source and the route that mapped it, or the
 * application's own dispatch.
 *
 * @example
 * ```ts
 * if (execution.provenance.kind === "source" && execution.provenance.initial) {
 *   console.log("launched the app");
 * }
 * ```
 */
export type IntentProvenance =
  | {
      kind: "source";
      source: { name: string };
      route: { id: string };
      /** Whether the source's launch read delivered it. */
      initial: boolean;
      /** What the provider claims about deferral, `null` when it says nothing. */
      deferred: boolean | null;
    }
  | { kind: "dispatch" };
