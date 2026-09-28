import type { ObservableValue } from "src/types/ObservableValue";
import type { SourceStatus } from "src/types/SourceStatus";

/**
 * The escape hatch to one source: its status and the SDK it was given, typed
 * as the application's own. Calls on `native` bypass Junction entirely.
 *
 * @example
 * ```ts
 * const branch = junction.source("referrals").native;
 * ```
 */
export type SourceHandle<TNative> = {
  status: ObservableValue<SourceStatus>;
  native: TNative;
};
