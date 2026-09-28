import type { JunctionError } from "src/utils/JunctionError";

/**
 * Where one source stands. `attached` means its listener is installed, not
 * that links, dashboards or native forwarding are configured, and `initial`
 * says how its launch read went.
 *
 * @example
 * ```ts
 * const status: SourceStatus = junction.source("links").status.get();
 * ```
 */
export type SourceStatus =
  | { state: "idle" }
  | {
      state: "attached";
      initial:
        "pending" | "received" | "empty" | "failed" | "timed-out" | "none";
      /** The last error that left the source attached: the provider's, or its launch read's failure or timeout, which a late answer clears. */
      error: JunctionError<
        "SOURCE_ERROR" | "INITIAL_READ_FAILED" | "INITIAL_READ_TIMED_OUT"
      > | null;
    }
  | { state: "failed"; error: JunctionError<"SOURCE_FAILED"> }
  | { state: "disposed" };
