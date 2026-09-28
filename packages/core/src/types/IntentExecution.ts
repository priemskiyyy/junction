import type { IntentOutcome } from "src/types/IntentOutcome";
import type { IntentProvenance } from "src/types/IntentProvenance";
import type { SynchronousEffect } from "src/types/internal/SynchronousEffect";

/**
 * One attempt at one intent, fixed when the attempt started. Its `signal`
 * aborts when the attempt is invalidated or its handler has answered, and
 * `commit` guards the final effect, so a stale `await` can never act.
 *
 * @example
 * ```ts
 * async ({ documentId }, { account, signal, reject, commit }) => {
 *   const access = await api.checkAccess({ documentId, account: account.id, signal });
 *
 *   if (!access.allowed) {
 *     return reject("not-authorized");
 *   }
 *
 *   return commit(() => navigation.openDocument(documentId));
 * };
 * ```
 */
export type IntentExecution<TName extends string, TAccount extends boolean> = {
  intent: { id: string; name: TName };
  attempt: { id: string; number: number };
  /** The account the intent is bound to, captured when the attempt started; `null` for a public intent. */
  account: TAccount extends true ? { id: string } : null;
  expires: { at: number };
  provenance: IntentProvenance;
  /** Aborts when the attempt is invalidated or its handler has answered. It is cooperative: it stops nothing by itself. */
  signal: AbortSignal;
  /** Throws `STALE_EXECUTION` when the attempt is no longer current. */
  assertCurrent: () => void;
  /** Runs the final synchronous effect once, if the attempt is still current, and latches it as handled; an effect that throws leaves the intent uncertain and is rethrown. */
  commit: <TEffect extends () => unknown>(
    effect: SynchronousEffect<TEffect>,
  ) => IntentOutcome;
  reject: (reason: string) => IntentOutcome;
  retry: (options: { after: number }) => IntentOutcome;
};
