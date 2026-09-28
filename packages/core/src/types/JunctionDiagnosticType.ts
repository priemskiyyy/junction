import type { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";

/**
 * The closed list of phrases a diagnostic event's `type` can be, from
 * `junction started` to `intent cancelled`, so a consumer can dispatch on it
 * exhaustively.
 *
 * @example
 * ```ts
 * const failures: JunctionDiagnosticType[] = ["source failed", "intent failed", "execution blocked"];
 * ```
 */
export type JunctionDiagnosticType =
  (typeof DIAGNOSTIC_TYPES)[keyof typeof DIAGNOSTIC_TYPES];
