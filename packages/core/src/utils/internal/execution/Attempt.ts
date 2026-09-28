import type { IntentExecution } from "src/types/IntentExecution";
import type { IntentOutcome } from "src/types/IntentOutcome";
import type { IntentRecord } from "src/types/internal/IntentRecord";
import type { Invalidation } from "src/types/internal/Invalidation";
import type { Registration } from "src/types/internal/Registration";
import { createId } from "src/utils/common/createId";
import { HANDLED_OUTCOME } from "src/utils/constants/outcomes";
import { getStaleError } from "src/utils/internal/execution/getStaleError";
import { JunctionError } from "src/utils/JunctionError";

export class Attempt {
  id = createId();
  record: IntentRecord;
  registration: Registration;
  execution: IntentExecution<string, boolean>;
  #controller = new AbortController();
  #invalidateIfStale: (attempt: Attempt) => Invalidation | null;
  #onCommit: (attempt: Attempt) => void;
  #invalidation: Invalidation | null = null;
  #latch: "HANDLED" | "UNCERTAIN" | null = null;
  #effectError: unknown = undefined;

  constructor({
    record,
    registration,
    account,
    invalidateIfStale,
    onCommit,
  }: {
    record: IntentRecord;
    registration: Registration;
    account: { id: string } | null;
    invalidateIfStale: (attempt: Attempt) => Invalidation | null;
    onCommit: (attempt: Attempt) => void;
  }) {
    this.record = record;
    this.registration = registration;
    this.#invalidateIfStale = invalidateIfStale;
    this.#onCommit = onCommit;
    this.execution = Object.freeze({
      intent: Object.freeze({ id: record.id, name: record.name }),
      attempt: Object.freeze({ id: this.id, number: record.attempts }),
      account: account === null ? null : Object.freeze({ id: account.id }),
      expires: Object.freeze({ at: record.expiresAt }),
      provenance: record.provenance,
      signal: this.#controller.signal,
      assertCurrent: () => {
        const invalidation = this.#invalidateIfStale(this);

        if (invalidation !== null) {
          throw getStaleError(invalidation);
        }
      },
      commit: (effect: () => unknown) => this.#commit(effect),
      reject: (reason: string): IntentOutcome =>
        Object.freeze({ status: "rejected", reason }),
      retry: ({ after }: { after: number }): IntentOutcome =>
        Object.freeze({ status: "retry", after }),
    });
  }

  invalidation = () => this.#invalidation;

  latch = () => this.#latch;

  effectError = () => this.#effectError;

  invalidate = (invalidation: Invalidation) => {
    const current = this.#invalidation;

    // A cancellation outranks an interruption, which would leave the intent to be retried.
    if (
      current !== null &&
      (invalidation.kind !== "CANCELLED" || current.kind !== "INTERRUPTED")
    ) {
      return false;
    }

    this.#invalidation = invalidation;
    this.#controller.abort();

    return true;
  };

  #commit(effect: () => unknown): IntentOutcome {
    if (this.#latch !== null) {
      throw new JunctionError({
        code: "ALREADY_SETTLED",
        message:
          "The attempt already committed its effect; a second one never runs.",
      });
    }

    const invalidation = this.#invalidateIfStale(this);

    if (invalidation !== null) {
      throw getStaleError(invalidation);
    }

    // Entered before the effect runs, so an unmount the effect causes cannot turn it into a replay.
    this.#latch = "UNCERTAIN";
    this.#onCommit(this);

    try {
      effect();
    } catch (error) {
      this.#effectError = error;

      throw error;
    }

    this.#latch = "HANDLED";

    return HANDLED_OUTCOME;
  }
}
