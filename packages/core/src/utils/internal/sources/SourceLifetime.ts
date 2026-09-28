import type { Admission } from "src/types/Admission";
import type { IncomingSource } from "src/types/IncomingSource";
import type { DiagnosticDetail } from "src/types/internal/DiagnosticDetail";
import type { Receipt } from "src/types/internal/Receipt";
import type { InitialRead } from "src/types/internal/InitialRead";
import type { SourceAttachment } from "src/types/SourceAttachment";
import type { SourceObservation } from "src/types/SourceObservation";
import type { SourceSink } from "src/types/SourceSink";
import type { SourceStatus } from "src/types/SourceStatus";
import { callContained } from "src/utils/common/callContained";
import { createDeferred } from "src/utils/common/createDeferred";
import { ValueStore } from "src/utils/common/ValueStore";
import { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";
import {
  DISPOSED_SOURCE_STATUS,
  IDLE_SOURCE_STATUS,
} from "src/utils/constants/states";
import type { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";
import { getRejection } from "src/utils/internal/inbox/getRejection";
import { unrefTimer } from "src/utils/internal/runtime/unrefTimer";
import { JunctionError } from "src/utils/JunctionError";

type Staged = {
  observation: SourceObservation<unknown>;
  timestamp: number;
  admission: ReturnType<typeof createDeferred<Admission>>;
};

const CALLBACK_IGNORED: DiagnosticDetail = Object.freeze({
  type: DIAGNOSTIC_TYPES.CALLBACK_IGNORED,
  context: null,
});

const INITIAL_READ_MESSAGES = Object.freeze({
  INITIAL_READ_FAILED: "The source's launch read failed.",
  INITIAL_READ_TIMED_OUT:
    "The source's launch read outlived its timeout; a late answer is still admitted.",
} satisfies Record<"INITIAL_READ_FAILED" | "INITIAL_READ_TIMED_OUT", string>);

const MALFORMED = getRejection(
  "invalid-input",
  "The source pushed something that is not an observation.",
);

const SILENCED = getRejection("disposed", "The source is no longer attached.");

export class SourceLifetime {
  name: string;
  source: IncomingSource<unknown, unknown>;
  #status = new ValueStore<SourceStatus>(IDLE_SOURCE_STATUS);
  #state: "IDLE" | "ATTACHING" | "ATTACHED" | "FAILED" | "DISPOSED" = "IDLE";
  #attachment: SourceAttachment<unknown> | null = null;
  #staged: Staged[] = [];
  #stagedFailure: { error: unknown } | null = null;
  #initial = createDeferred<InitialRead>();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #admit: (
    observation: SourceObservation<unknown>,
    receipt: Receipt,
  ) => Admission | Promise<Admission>;
  #now: () => number;
  #timeout: number;
  #diagnostics: Diagnostics;

  constructor({
    name,
    source,
    admit,
    now,
    timeout,
    diagnostics,
  }: {
    name: string;
    source: IncomingSource<unknown, unknown>;
    admit: (
      observation: SourceObservation<unknown>,
      receipt: Receipt,
    ) => Admission | Promise<Admission>;
    now: () => number;
    timeout: number;
    diagnostics: Diagnostics;
  }) {
    this.name = name;
    this.source = source;
    this.#admit = admit;
    this.#now = now;
    this.#timeout = timeout;
    this.#diagnostics = diagnostics;
  }

  status = Object.freeze({
    get: this.#status.get,
    subscribe: this.#status.subscribe,
  });

  attach = (): Promise<InitialRead> => {
    if (this.#state !== "IDLE") {
      return this.#initial.promise;
    }

    this.#state = "ATTACHING";

    let attachment: SourceAttachment<unknown>;
    let initial: SourceAttachment<unknown>["initial"];

    try {
      attachment = this.source.attach(this.#sink);

      // A JavaScript source can answer anything; what is not an attachment fails it as a throw does.
      if (typeof attachment !== "object" || attachment === null) {
        throw new TypeError(
          "attach answered something that is not an attachment.",
        );
      }

      initial = attachment.initial;
    } catch (error) {
      this.#fail(error);

      return this.#initial.promise;
    }

    if (this.#state !== "ATTACHING") {
      // Disposed from inside attach: what it installed is removed at once.
      this.#disposeAttachment(attachment);
      this.#silenceStaged();

      return this.#initial.promise;
    }

    this.#attachment = attachment;
    this.#state = "ATTACHED";
    this.#setStatus({
      state: "attached",
      initial: typeof initial === "function" ? "pending" : "none",
      error: null,
    });
    this.#record({
      type: DIAGNOSTIC_TYPES.SOURCE_ATTACHED,
      context: null,
    });

    const failure = this.#stagedFailure;

    this.#stagedFailure = null;

    if (failure !== null) {
      this.#sink.fail(failure.error);
    }

    for (const { observation, timestamp, admission } of this.#staged.splice(
      0,
    )) {
      admission.resolve(
        this.#contain(observation, { timestamp, initial: false }),
      );
    }

    // A listener that heard the attachment or a staged admission may have disposed the source.
    if (this.#state !== "ATTACHED") {
      return this.#initial.promise;
    }

    if (typeof initial !== "function") {
      this.#initial.resolve("none");

      return this.#initial.promise;
    }

    this.#readInitial(initial);

    return this.#initial.promise;
  };

  dispose = () => {
    if (this.#state === "DISPOSED") {
      return;
    }

    const attachment = this.#attachment;
    const attaching = this.#state === "ATTACHING";

    this.#state = "DISPOSED";
    this.#attachment = null;

    if (this.#timer !== null) {
      clearTimeout(this.#timer);
    }

    this.#status.set(DISPOSED_SOURCE_STATUS);
    this.#initial.resolve("not-attached");

    if (!attaching) {
      this.#silenceStaged();
    }

    if (attachment !== null) {
      this.#disposeAttachment(attachment);
    }
  };

  #sink: SourceSink<unknown> = Object.freeze({
    push: (observation: SourceObservation<unknown>) => {
      const timestamp = this.#now();

      if (this.#state === "ATTACHING") {
        const admission = createDeferred<Admission>();

        this.#staged.push({ observation, timestamp, admission });

        return admission.promise;
      }

      if (this.#state !== "ATTACHED") {
        this.#record(CALLBACK_IGNORED);

        return Promise.resolve(SILENCED);
      }

      return Promise.resolve(
        this.#contain(observation, { timestamp, initial: false }),
      );
    },
    fail: (error: unknown) => {
      if (this.#state === "ATTACHING") {
        this.#stagedFailure = { error };

        return;
      }

      const status = this.#status.get();

      if (this.#state !== "ATTACHED" || status.state !== "attached") {
        this.#record(CALLBACK_IGNORED);

        return;
      }

      this.#setStatus({
        ...status,
        error: new JunctionError({
          code: "SOURCE_ERROR",
          message: "The provider reported an error.",
          cause: error,
        }),
      });
      this.#record({
        type: DIAGNOSTIC_TYPES.SOURCE_ERROR,
        context: null,
      });
    },
  });

  #readInitial(read: NonNullable<SourceAttachment<unknown>["initial"]>) {
    // The receipt is stamped when the read starts, so a slow read never earns a fresher deadline.
    const timestamp = this.#now();

    let settled = false;

    const timer = setTimeout(() => {
      settled = true;
      this.#setInitial({
        initial: "timed-out",
        late: false,
        failure: { code: "INITIAL_READ_TIMED_OUT", cause: undefined },
      });
    }, this.#timeout);

    this.#timer = timer;
    unrefTimer(timer);

    new Promise<SourceObservation<unknown> | null>((resolve) =>
      resolve(read()),
    ).then(
      (observation) => {
        clearTimeout(timer);

        if (this.#state !== "ATTACHED") {
          this.#record(CALLBACK_IGNORED);

          return;
        }

        const late = settled;

        settled = true;

        if (observation === null) {
          this.#setInitial({ initial: "empty", late, failure: null });

          return;
        }

        if (typeof observation !== "object" || !("input" in observation)) {
          this.#setInitial({
            initial: "failed",
            late,
            failure: { code: "INITIAL_READ_FAILED", cause: observation },
          });

          return;
        }

        this.#contain(observation, { timestamp, initial: true });

        this.#setInitial({ initial: "received", late, failure: null });
      },
      (error: unknown) => {
        clearTimeout(timer);

        if (this.#state !== "ATTACHED") {
          this.#record(CALLBACK_IGNORED);

          return;
        }

        const late = settled;

        settled = true;
        this.#setInitial({
          initial: "failed",
          late,
          failure: { code: "INITIAL_READ_FAILED", cause: error },
        });
      },
    );
  }

  // A push that breaks the contract, such as one of nothing, is refused rather than thrown back into the provider's callback.
  #contain(
    observation: SourceObservation<unknown>,
    receipt: Receipt,
  ): Admission | Promise<Admission> {
    try {
      return this.#admit(observation, receipt);
    } catch {
      this.#record({
        type: DIAGNOSTIC_TYPES.OBSERVATION_REJECTED,
        context: { reason: "invalid-input" },
      });

      return MALFORMED;
    }
  }

  #setInitial({
    initial,
    late,
    failure,
  }: {
    initial: "received" | "empty" | "failed" | "timed-out";
    late: boolean;
    failure: {
      code: "INITIAL_READ_FAILED" | "INITIAL_READ_TIMED_OUT";
      cause: unknown;
    } | null;
  }) {
    const status = this.#status.get();

    if (status.state === "attached") {
      // A late answer settles the read, so the timeout it outlived is no longer the source's error.
      const kept =
        status.error?.code === "INITIAL_READ_TIMED_OUT" ? null : status.error;

      this.#setStatus({
        state: "attached",
        initial,
        error:
          failure === null
            ? kept
            : new JunctionError({
                code: failure.code,
                message: INITIAL_READ_MESSAGES[failure.code],
                cause: failure.cause,
              }),
      });
    }

    this.#record({
      type: DIAGNOSTIC_TYPES.INITIAL_READ_SETTLED,
      context: { initial, late },
    });
    this.#initial.resolve(initial);
  }

  #fail(error: unknown) {
    this.#state = "FAILED";
    this.#setStatus({
      state: "failed",
      error: new JunctionError({
        code: "SOURCE_FAILED",
        message: "The source could not attach.",
        cause: error,
      }),
    });
    this.#silenceStaged();
    this.#record({
      type: DIAGNOSTIC_TYPES.SOURCE_FAILED,
      context: null,
    });
    this.#initial.resolve("not-attached");
  }

  #silenceStaged() {
    for (const { admission } of this.#staged.splice(0)) {
      this.#record(CALLBACK_IGNORED);
      admission.resolve(SILENCED);
    }
  }

  #disposeAttachment(attachment: SourceAttachment<unknown>) {
    const { dispose } = attachment;

    if (typeof dispose !== "function") {
      return;
    }

    callContained(
      () => dispose.call(attachment),
      () =>
        this.#record({
          type: DIAGNOSTIC_TYPES.SOURCE_DISPOSE_FAILED,
          context: null,
        }),
    );
  }

  #setStatus(status: SourceStatus) {
    if ("error" in status && status.error !== null) {
      Object.freeze(status.error);
    }

    this.#status.set(Object.freeze(status));
    this.#diagnostics.changed();
  }

  #record(detail: DiagnosticDetail) {
    this.#diagnostics.record({ ...detail, source: this.name, intent: null });
  }
}
