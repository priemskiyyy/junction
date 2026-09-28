import type { IntentProvenance } from "src/types/IntentProvenance";
import type { FailureCode } from "src/types/internal/FailureCode";
import type { InterruptionCode } from "src/types/internal/InterruptionCode";
import type { WaitingReason } from "src/types/WaitingReason";
import type { JunctionError } from "src/utils/JunctionError";

/**
 * One intent that has not ended yet, as the inbox shows it. The fields after
 * `state` are the ones that state has: why a pending intent waits, which
 * attempt a leased one runs, when a retry may start, or what failed.
 *
 * @example
 * ```ts
 * const waiting = junction.inbox.get().flatMap((entry) => {
 *   if (entry.state !== "pending" || entry.waiting.reason !== "authentication") {
 *     return [];
 *   }
 *
 *   return [entry];
 * });
 * ```
 */
export type InboxEntry<TName extends string, TPayload> = {
  id: string;
  name: TName;
  payload: TPayload;
  attempts: number;
  /** A public intent runs for anyone; a bound one only for its account. */
  binding:
    | { kind: "public" }
    | { kind: "unbound" }
    | { kind: "bound"; account: { id: string } };
  /** When the intent was received, in epoch milliseconds. */
  timestamp: number;
  expires: { at: number };
  provenance: IntentProvenance;
} & (
  | {
      state: "pending";
      waiting: {
        reason: WaitingReason;
        /** The consumers the reason is about: the candidates of an ambiguity, or the owner that is not ready. */
        consumers: { id: string; name: string | null }[];
      };
    }
  | { state: "leased"; attempt: { id: string; number: number } }
  | { state: "retry-scheduled"; retry: { at: number } }
  | { state: "failed"; error: JunctionError<FailureCode> }
  | { state: "interrupted"; error: JunctionError<InterruptionCode> }
);
