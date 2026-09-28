import type { Admission } from "src/types/Admission";
import type { InboxEntry } from "src/types/InboxEntry";
import type { Candidate } from "src/types/internal/Candidate";
import type { DiagnosticContexts } from "src/types/internal/DiagnosticContexts";
import type { DiagnosticDetail } from "src/types/internal/DiagnosticDetail";
import type {
  IntentRecord,
  RecordState,
} from "src/types/internal/IntentRecord";
import type { InterruptionCode } from "src/types/internal/InterruptionCode";
import type { Invalidation } from "src/types/internal/Invalidation";
import type { Registration } from "src/types/internal/Registration";
import type { RestoredInbox } from "src/types/internal/RestoredInbox";
import type { Settlement } from "src/types/internal/Settlement";
import type { StoredIntent } from "src/types/internal/StoredIntent";
import type { StoredLedgerEntry } from "src/types/internal/StoredLedgerEntry";
import type { Waiting } from "src/types/internal/Waiting";
import type { WriteResult } from "src/types/internal/WriteResult";
import type { JunctionSnapshot } from "src/types/JunctionSnapshot";
import type { ObservableValue } from "src/types/ObservableValue";
import type { RecoveryResult } from "src/types/RecoveryResult";
import { assertUnreachable } from "src/utils/common/assertUnreachable";
import { createId } from "src/utils/common/createId";
import { ValueStore } from "src/utils/common/ValueStore";
import { MAX_DURATION } from "src/utils/constants/defaults";
import { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";
import { FAILURE_MESSAGES } from "src/utils/constants/failures";
import { INBOX_CAPACITY, INBOX_PAYLOAD_SIZE } from "src/utils/constants/limits";
import { EMPTY_INBOX } from "src/utils/constants/states";
import { getReadiness } from "src/utils/internal/consumers/getReadiness";
import { selectOwner } from "src/utils/internal/consumers/selectOwner";
import type { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";
import { getSourceName } from "src/utils/internal/diagnostics/getSourceName";
import { Attempt } from "src/utils/internal/execution/Attempt";
import { getSettlement } from "src/utils/internal/execution/getSettlement";
import type { IdentityBinding } from "src/utils/internal/identity/IdentityBinding";
import { getBinding } from "src/utils/internal/inbox/getBinding";
import { getFingerprint } from "src/utils/internal/inbox/getFingerprint";
import { getInboxEntry } from "src/utils/internal/inbox/getInboxEntry";
import { getRejection } from "src/utils/internal/inbox/getRejection";
import { getWaiting } from "src/utils/internal/inbox/getWaiting";
import { InteractionLedger } from "src/utils/internal/inbox/InteractionLedger";
import { isSameWaiting } from "src/utils/internal/inbox/isSameWaiting";
import { unrefTimer } from "src/utils/internal/runtime/unrefTimer";
import { getStoredIntent } from "src/utils/internal/storage/getStoredIntent";
import type { StorageWriter } from "src/utils/internal/storage/StorageWriter";
import { JunctionError } from "src/utils/JunctionError";

type Decision =
  | { kind: "RUN"; registration: Registration }
  | { kind: "WAIT"; waiting: Waiting };

type Running = {
  attempt: Attempt;
  timer: ReturnType<typeof setTimeout> | null;
  blocked: boolean;
  unleased: IntentRecord["binding"];
};

type Lease = { running: Running; write: Promise<WriteResult> | null };

const CAPACITY_WAITING = getWaiting("capacity", []);

const STORAGE_WAITING = getWaiting("storage", []);

const isWaitingState = ({ state }: RecordState) =>
  state === "ADMITTED" || state === "PENDING";

type RecordedInvalidation = Extract<
  Invalidation,
  { kind: "INTERRUPTED" | "EXPIRED" | "CANCELLED" }
>;

const getInvalidationContext = (
  invalidation: RecordedInvalidation,
): DiagnosticContexts["attempt invalidated"] => {
  if (invalidation.kind === "INTERRUPTED") {
    return { reason: "interrupted", code: invalidation.code };
  }

  if (invalidation.kind === "EXPIRED") {
    return { reason: "expired", code: null };
  }

  if (invalidation.kind === "CANCELLED") {
    return { reason: "cancelled", code: null };
  }

  return assertUnreachable(invalidation);
};

const PUBLIC_STATES = Object.freeze({
  ADMITTED: "pending",
  PENDING: "pending",
  LEASED: "leased",
  RETRY_SCHEDULED: "retry-scheduled",
  FAILED: "failed",
  INTERRUPTED: "interrupted",
} satisfies Record<
  RecordState["state"],
  JunctionSnapshot["intents"][number]["state"]
>);

export class Inbox {
  #now: () => number;
  #identity: IdentityBinding;
  #diagnostics: Diagnostics;
  #storage: StorageWriter | null = null;
  #records = new Map<string, IntentRecord>();
  #registrations = new Map<string, Registration[]>();
  #ledger = new InteractionLedger();
  #store = new ValueStore<InboxEntry<string, unknown>[]>(EMPTY_INBOX);
  #entries = new Map<
    string,
    { revision: number; entry: InboxEntry<string, unknown> }
  >();
  #state: "IDLE" | "STARTED" | "DISPOSED" = "IDLE";
  #running: Running | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #scheduled = false;

  constructor({
    now,
    identity,
    diagnostics,
  }: {
    now: () => number;
    identity: IdentityBinding;
    diagnostics: Diagnostics;
  }) {
    this.#now = now;
    this.#identity = identity;
    this.#diagnostics = diagnostics;
  }

  entries: ObservableValue<InboxEntry<string, unknown>[]> = Object.freeze({
    get: this.#store.get,
    subscribe: this.#store.subscribe,
  });

  attachStorage = (storage: StorageWriter) => {
    this.#storage = storage;
  };

  getStoredState = (): {
    intents: StoredIntent[];
    ledger: StoredLedgerEntry[];
  } => ({
    intents: [...this.#records.values()].flatMap((record) => {
      if (!record.definition.persistent) {
        return [];
      }

      return [getStoredIntent(record)];
    }),
    ledger: this.#ledger.getStoredEntries(this.#now()),
  });

  restore = (
    { records, quarantined }: RestoredInbox,
    ledger: StoredLedgerEntry[],
  ) => {
    const now = this.#now();

    for (const { record, fingerprint } of records) {
      this.#records.set(record.id, record);

      if (record.interaction !== null) {
        this.#ledger.reserve(record.interaction, {
          intent: record.id,
          fingerprint,
          persistent: true,
        });
      }
    }

    // A quarantined intent ends as cancelled, so a replay of its occurrence stays a duplicate.
    this.#ledger.restore(
      [
        ...ledger,
        ...quarantined.flatMap(({ id, interaction }) => {
          if (interaction === null) {
            return [];
          }

          return [{ ...interaction, intent: { id }, timestamp: now }];
        }),
      ],
      now,
    );
  };

  storageChanged = () => {
    this.#schedule();
  };

  start = () => {
    this.#state = "STARTED";
    this.#schedule();
  };

  dispose = () => {
    this.#state = "DISPOSED";

    if (this.#timer !== null) {
      clearTimeout(this.#timer);
    }

    const running = this.#running;

    if (running !== null) {
      if (running.timer !== null) {
        clearTimeout(running.timer);
      }

      running.attempt.invalidate({ kind: "DISPOSED" });
    }

    for (const registrations of this.#registrations.values()) {
      for (const registration of registrations) {
        registration.disposed = true;
      }
    }

    this.#registrations.clear();
  };

  admit = (
    candidate: Candidate,
  ): { admission: Admission; write: Promise<WriteResult> | null } => {
    const refusal = this.#getAdmissionRefusal(candidate);

    if (refusal !== null) {
      return { admission: refusal, write: null };
    }

    const { prepared } = candidate;
    const fingerprint = getFingerprint(candidate.name, prepared.text);

    const known =
      candidate.interaction === null
        ? undefined
        : this.#ledger.find(candidate.interaction, this.#now());

    if (known !== undefined) {
      if (known.fingerprint !== fingerprint) {
        return {
          admission: getRejection(
            "interaction-conflict",
            "The same interaction already produced another intent or payload.",
          ),
          write: null,
        };
      }

      return {
        admission: Object.freeze({
          status: "duplicate",
          intent: Object.freeze({ id: known.intent }),
          durability: "memory",
        }),
        write:
          known.persistent && this.#storage !== null
            ? this.#storage.flush()
            : null,
      };
    }

    const expiresAt = candidate.timestamp + prepared.definition.expires.in;

    if (expiresAt <= this.#now()) {
      return {
        admission: getRejection(
          "expired",
          "The intent expired before it was admitted.",
        ),
        write: null,
      };
    }

    let size = prepared.size;

    for (const record of this.#records.values()) {
      size += record.size;
    }

    if (this.#records.size >= INBOX_CAPACITY || size > INBOX_PAYLOAD_SIZE) {
      return {
        admission: getRejection(
          "inbox-full",
          `The inbox holds ${INBOX_CAPACITY} intents and ${INBOX_PAYLOAD_SIZE} bytes of payload at most.`,
        ),
        write: null,
      };
    }

    const id = createId();
    const { persistent } = prepared.definition;

    this.#records.set(id, {
      id,
      name: candidate.name,
      definition: prepared.definition,
      payload: prepared.payload,
      size: prepared.size,
      timestamp: candidate.timestamp,
      expiresAt,
      provenance: candidate.provenance,
      binding: getBinding({
        accountBound: prepared.definition.account,
        target: prepared.target,
        identity: this.#identity.current(),
      }),
      attempts: 0,
      interaction: candidate.interaction,
      current: { state: "ADMITTED" },
      revision: 0,
    });

    if (candidate.interaction !== null) {
      this.#ledger.reserve(candidate.interaction, {
        intent: id,
        fingerprint,
        persistent,
      });
    }

    this.#schedule();

    return {
      admission: Object.freeze({
        status: "accepted",
        intent: Object.freeze({ id }),
        durability: "memory",
      }),
      write: this.#write(persistent),
    };
  };

  register = (
    intent: string,
    options: Registration["options"],
  ): Registration => {
    const registration: Registration = {
      id: createId(),
      intent,
      disposed: false,
      options,
    };

    if (this.#state === "DISPOSED") {
      return registration;
    }

    this.#registrations.set(intent, [
      ...(this.#registrations.get(intent) ?? []),
      registration,
    ]);
    this.#diagnostics.changed();
    this.#schedule();

    return registration;
  };

  update = (registration: Registration, options: Registration["options"]) => {
    this.#assertRegistered(registration);

    if (this.#state === "DISPOSED") {
      return;
    }

    const previous = registration.options;

    registration.options = options;

    if (!Object.is(options.scope, previous.scope)) {
      this.#invalidateOwner(registration, "SCOPE_CHANGED");
    }

    this.#invalidateIfOwnerStale(registration);

    // Diagnostics show only these two fields of a consumer, so no other change notifies their observers.
    if (
      options.name !== previous.name ||
      options.fallback !== previous.fallback
    ) {
      this.#diagnostics.changed();
    }

    this.#schedule();
  };

  refresh = () => {
    const running = this.#running;

    if (running !== null) {
      this.#invalidateIfOwnerStale(running.attempt.registration);
    }

    this.#schedule();
  };

  unregister = (registration: Registration) => {
    if (registration.disposed) {
      return;
    }

    registration.disposed = true;

    if (this.#state === "DISPOSED") {
      return;
    }

    const remaining = (
      this.#registrations.get(registration.intent) ?? []
    ).filter((candidate) => candidate !== registration);

    this.#registrations.set(registration.intent, remaining);
    this.#invalidateOwner(registration, "OWNER_DISPOSED");
    this.#diagnostics.changed();
    this.#schedule();
  };

  identityChanged = () => {
    const running = this.#running;

    if (running !== null) {
      this.#invalidate(running.attempt, {
        kind: "INTERRUPTED",
        code: "IDENTITY_CHANGED",
      });
    }

    this.#schedule();
  };

  retry = (id: string, after: number): RecoveryResult => {
    const refusal = this.#getLifecycleRefusal();

    if (refusal !== null) {
      return refusal;
    }

    const record = this.#records.get(id);

    if (record === undefined) {
      return Object.freeze({ status: "refused", reason: "unknown" });
    }

    const { state } = record.current;

    if (state === "LEASED") {
      return Object.freeze({ status: "refused", reason: "running" });
    }

    if (state !== "FAILED" && state !== "INTERRUPTED") {
      return Object.freeze({ status: "refused", reason: "not-recoverable" });
    }

    if (record.attempts >= record.definition.attempts) {
      return Object.freeze({ status: "refused", reason: "attempts-exhausted" });
    }

    const at = this.#now() + after;

    if (at >= record.expiresAt) {
      return Object.freeze({ status: "refused", reason: "expired" });
    }

    this.#transition(
      record,
      after === 0 ? { state: "ADMITTED" } : { state: "RETRY_SCHEDULED", at },
    );
    this.#record(record, {
      type: DIAGNOSTIC_TYPES.RETRY_SCHEDULED,
      context: { after },
    });
    this.#schedule();

    return Object.freeze({ status: "applied" });
  };

  cancel = (id: string): RecoveryResult => {
    const refusal = this.#getLifecycleRefusal();

    if (refusal !== null) {
      return refusal;
    }

    const record = this.#records.get(id);

    if (record === undefined) {
      return Object.freeze({ status: "refused", reason: "unknown" });
    }

    if (record.current.state === "LEASED") {
      this.#invalidate(record.current.attempt, { kind: "CANCELLED" });

      return Object.freeze({ status: "requested" });
    }

    this.#end(record, {
      type: DIAGNOSTIC_TYPES.INTENT_CANCELLED,
      context: { running: false },
    });
    this.#schedule();

    return Object.freeze({ status: "applied" });
  };

  getSnapshot = (): Pick<
    JunctionSnapshot,
    "consumers" | "intents" | "running"
  > => {
    const running = this.#running;

    const consumers = [...this.#registrations.values()]
      .flat()
      .map(({ id, intent, options }) =>
        Object.freeze({
          id,
          name: options.name,
          intent: Object.freeze({ name: intent }),
          fallback: options.fallback,
        }),
      );

    const intents = [...this.#records.values()].map((record) =>
      Object.freeze({
        id: record.id,
        name: record.name,
        state: PUBLIC_STATES[record.current.state],
        attempts: record.attempts,
        waiting:
          record.current.state === "PENDING"
            ? record.current.waiting.reason
            : null,
      }),
    );

    Object.freeze(consumers);
    Object.freeze(intents);

    return {
      consumers,
      intents,
      running:
        running === null
          ? null
          : Object.freeze({
              intent: Object.freeze({ id: running.attempt.record.id }),
              attempt: Object.freeze({ id: running.attempt.id }),
              blocked: running.blocked,
            }),
    };
  };

  #schedule() {
    if (this.#scheduled || this.#state !== "STARTED") {
      return;
    }

    this.#scheduled = true;
    queueMicrotask(this.#turn);
  }

  #turn = () => {
    this.#scheduled = false;

    if (this.#state !== "STARTED") {
      return;
    }

    const now = this.#now();

    for (const record of [...this.#records.values()]) {
      if (record.expiresAt > now) {
        continue;
      }

      if (record.current.state === "LEASED") {
        this.#invalidate(record.current.attempt, { kind: "EXPIRED" });

        continue;
      }

      this.#end(record, {
        type: DIAGNOSTIC_TYPES.INTENT_EXPIRED,
        context: { running: false },
      });
    }

    let leased: Lease | null = null;

    for (const record of this.#records.values()) {
      const { current } = record;

      const evaluable =
        current.state === "ADMITTED" ||
        current.state === "PENDING" ||
        (current.state === "RETRY_SCHEDULED" && current.at <= now);

      if (!evaluable || this.#state !== "STARTED") {
        continue;
      }

      const decision = this.#decide(record);

      if (decision.kind === "RUN" && this.#running === null) {
        leased = this.#lease(record, decision.registration);

        continue;
      }

      this.#wait(
        record,
        decision.kind === "RUN" ? CAPACITY_WAITING : decision.waiting,
      );
    }

    if (this.#state !== "STARTED") {
      return;
    }

    this.#arm(now);
    this.#publish();

    if (leased === null) {
      return;
    }

    const { running, write } = leased;

    if (write === null) {
      this.#resume(running, "committed");

      return;
    }

    write.then((result) => this.#resume(running, result));
  };

  #decide(record: IntentRecord): Decision {
    const selection = selectOwner(
      this.#registrations.get(record.name) ?? [],
      record.payload,
    );

    if (selection.kind === "WAITING") {
      return {
        kind: "WAIT",
        waiting: getWaiting(selection.reason, selection.consumers),
      };
    }

    const { registration } = selection;
    const readiness = getReadiness(registration);

    if (readiness !== "READY") {
      return {
        kind: "WAIT",
        waiting: getWaiting(
          readiness === "FAILED" ? "readiness-error" : "consumer-not-ready",
          [registration],
        ),
      };
    }

    if (!record.definition.account) {
      return this.#getRunDecision(record, registration);
    }

    const identity = this.#identity.current();

    if (identity.status === "restoring") {
      return { kind: "WAIT", waiting: getWaiting("identity-restoring", []) };
    }

    if (identity.status === "anonymous") {
      return { kind: "WAIT", waiting: getWaiting("authentication", []) };
    }

    if (
      record.binding.kind === "bound" &&
      record.binding.account.id !== identity.account.id
    ) {
      return { kind: "WAIT", waiting: getWaiting("account-mismatch", []) };
    }

    return this.#getRunDecision(record, registration);
  }

  #getRunDecision(record: IntentRecord, registration: Registration): Decision {
    if (
      record.definition.persistent &&
      this.#storage?.durability() === "unconfirmed"
    ) {
      return { kind: "WAIT", waiting: STORAGE_WAITING };
    }

    return { kind: "RUN", registration };
  }

  #wait(record: IntentRecord, waiting: Waiting) {
    const { current } = record;

    if (
      current.state === "PENDING" &&
      isSameWaiting(current.waiting, waiting)
    ) {
      return;
    }

    this.#transition(record, { state: "PENDING", waiting });
    this.#record(record, {
      type: DIAGNOSTIC_TYPES.INTENT_WAITING,
      context: {
        reason: waiting.reason,
        consumers: waiting.consumers.length,
      },
    });
  }

  #lease(record: IntentRecord, registration: Registration): Lease {
    const identity = this.#identity.current();
    const unleased = record.binding;

    if (
      record.binding.kind === "unbound" &&
      identity.status === "authenticated"
    ) {
      record.binding = getBinding({
        accountBound: true,
        target: identity.account.id,
        identity,
      });
    }

    record.attempts += 1;

    const { binding } = record;

    const attempt = new Attempt({
      record,
      registration,
      account: binding.kind === "bound" ? binding.account : null,
      invalidateIfStale: this.#invalidateIfStale,
      onCommit: (committed) =>
        this.#record(committed.record, {
          type: DIAGNOSTIC_TYPES.EFFECT_COMMITTED,
          context: null,
        }),
    });

    const running: Running = {
      attempt,
      timer: null,
      blocked: false,
      unleased,
    };

    this.#running = running;

    const write = this.#transition(record, { state: "LEASED", attempt });

    this.#record(record, {
      type: DIAGNOSTIC_TYPES.ATTEMPT_STARTED,
      context: {
        attempt: Object.freeze({ id: attempt.id, number: record.attempts }),
        consumer: Object.freeze({ id: registration.id }),
      },
    });

    return { running, write };
  }

  #resume(running: Running, result: WriteResult) {
    if (this.#state !== "STARTED") {
      return;
    }

    const { attempt } = running;

    // Selecting calls every match again, which may cancel or dispose, so the lease is checked after it.
    if (
      result === "committed" &&
      this.#isSelected(attempt) &&
      this.#invalidateIfStale(attempt) === null
    ) {
      this.#invoke(running);

      return;
    }

    if (this.#state !== "STARTED") {
      return;
    }

    this.#running = null;
    this.#abandon(running);
    this.#diagnostics.changed();
    this.#schedule();
  }

  #isSelected({ record, registration }: Attempt) {
    const selection = selectOwner(
      this.#registrations.get(record.name) ?? [],
      record.payload,
    );

    return (
      selection.kind === "OWNER" && selection.registration === registration
    );
  }

  #abandon({ attempt: { record, invalidation }, unleased }: Running) {
    const ended = invalidation();

    if (ended?.kind === "CANCELLED") {
      this.#end(record, {
        type: DIAGNOSTIC_TYPES.INTENT_CANCELLED,
        context: { running: false },
      });

      return;
    }

    if (ended?.kind === "EXPIRED") {
      this.#end(record, {
        type: DIAGNOSTIC_TYPES.INTENT_EXPIRED,
        context: { running: false },
      });

      return;
    }

    record.binding = unleased;
    record.attempts -= 1;
    this.#transition(record, { state: "ADMITTED" });
  }

  #invoke(running: Running) {
    const { attempt } = running;

    running.timer = setTimeout(
      () => this.#timeOut(running),
      attempt.registration.options.timeout,
    );
    unrefTimer(running.timer);

    // A synchronous throw becomes a rejection, so every answer settles the same way.
    new Promise((resolve) =>
      resolve(
        attempt.registration.options.handler(
          attempt.record.payload,
          attempt.execution,
        ),
      ),
    ).then(
      (value) => this.#settle(running, { kind: "RETURNED", value }),
      (error: unknown) => this.#settle(running, { kind: "THREW", error }),
    );
  }

  #settle(
    running: Running,
    outcome:
      { kind: "RETURNED"; value: unknown } | { kind: "THREW"; error: unknown },
  ) {
    const { attempt, timer } = running;

    if (timer !== null) {
      clearTimeout(timer);
    }

    this.#running = null;

    if (this.#state !== "STARTED") {
      return;
    }

    this.#apply(
      attempt.record,
      getSettlement({
        latch: attempt.latch(),
        effectError: attempt.effectError(),
        invalidation: attempt.invalidation(),
        outcome,
      }),
    );
    attempt.invalidate({ kind: "SETTLED" });
    this.#diagnostics.changed();
    this.#schedule();
  }

  #apply(record: IntentRecord, settlement: Settlement) {
    if (settlement.kind === "ACKNOWLEDGED") {
      this.#end(record, {
        type: DIAGNOSTIC_TYPES.INTENT_ACKNOWLEDGED,
        context: { ignored: settlement.ignored },
      });

      return;
    }

    if (settlement.kind === "REJECTED") {
      this.#end(record, {
        type: DIAGNOSTIC_TYPES.INTENT_REJECTED,
        context: { reason: settlement.reason },
      });

      return;
    }

    if (settlement.kind === "RETRY") {
      this.#retryAfter(record, settlement.after);

      return;
    }

    if (settlement.kind === "FAILED") {
      this.#transition(record, { state: "FAILED", error: settlement.error });
      this.#record(record, {
        type: DIAGNOSTIC_TYPES.INTENT_FAILED,
        context: { code: settlement.error.code },
      });

      return;
    }

    if (settlement.kind === "INTERRUPTED") {
      this.#transition(record, {
        state: "INTERRUPTED",
        error: settlement.error,
      });
      this.#record(record, {
        type: DIAGNOSTIC_TYPES.INTENT_INTERRUPTED,
        context: { code: settlement.error.code },
      });

      return;
    }

    if (settlement.kind === "EXPIRED") {
      this.#end(record, {
        type: DIAGNOSTIC_TYPES.INTENT_EXPIRED,
        context: { running: true },
      });

      return;
    }

    if (settlement.kind === "CANCELLED") {
      this.#end(record, {
        type: DIAGNOSTIC_TYPES.INTENT_CANCELLED,
        context: { running: true },
      });

      return;
    }

    assertUnreachable(settlement);
  }

  #retryAfter(record: IntentRecord, after: number) {
    if (record.attempts >= record.definition.attempts) {
      const error = new JunctionError({
        code: "ATTEMPTS_EXHAUSTED",
        message: FAILURE_MESSAGES.ATTEMPTS_EXHAUSTED,
      });

      this.#transition(record, { state: "FAILED", error });
      this.#record(record, {
        type: DIAGNOSTIC_TYPES.INTENT_FAILED,
        context: { code: error.code },
      });

      return;
    }

    const at = this.#now() + after;

    if (at >= record.expiresAt) {
      this.#end(record, {
        type: DIAGNOSTIC_TYPES.INTENT_EXPIRED,
        context: { running: false },
      });

      return;
    }

    this.#transition(record, { state: "RETRY_SCHEDULED", at });
    this.#record(record, {
      type: DIAGNOSTIC_TYPES.RETRY_SCHEDULED,
      context: { after },
    });
  }

  #end(record: IntentRecord, detail: DiagnosticDetail) {
    if (!this.#records.delete(record.id)) {
      return;
    }

    this.#entries.delete(record.id);

    if (record.interaction !== null) {
      this.#ledger.settle(record.interaction, this.#now());
    }

    this.#write(record.definition.persistent);
    this.#diagnostics.changed();
    this.#record(record, detail);
  }

  #invalidateIfStale = (attempt: Attempt): Invalidation | null => {
    if (attempt.invalidation() !== null) {
      return attempt.invalidation();
    }

    const { record } = attempt;

    // A record moves on from its lease before any listener hears the outcome, so an answered attempt is stale by then.
    if (
      this.#records.get(record.id) !== record ||
      record.current.state !== "LEASED" ||
      record.current.attempt !== attempt
    ) {
      attempt.invalidate({ kind: "SETTLED" });

      return attempt.invalidation();
    }

    if (this.#now() >= record.expiresAt) {
      this.#invalidate(attempt, { kind: "EXPIRED" });

      return attempt.invalidation();
    }

    const code = this.#getOwnerCode(
      attempt.registration,
      attempt.record.payload,
    );

    if (code !== null) {
      this.#invalidate(attempt, { kind: "INTERRUPTED", code });
    }

    return attempt.invalidation();
  };

  #getOwnerCode(
    registration: Registration,
    payload: unknown,
  ): InterruptionCode | null {
    if (registration.disposed) {
      return "OWNER_DISPOSED";
    }

    let matches: boolean;

    try {
      matches = registration.options.match(payload) === true;
    } catch {
      matches = false;
    }

    if (!matches) {
      return "OWNER_UNMATCHED";
    }

    if (getReadiness(registration) !== "READY") {
      return "OWNER_NOT_READY";
    }

    return null;
  }

  #invalidateIfOwnerStale(registration: Registration) {
    const running = this.#running;

    if (running === null || running.attempt.registration !== registration) {
      return;
    }

    const code = this.#getOwnerCode(
      registration,
      running.attempt.record.payload,
    );

    if (code !== null) {
      this.#invalidate(running.attempt, { kind: "INTERRUPTED", code });
    }
  }

  #invalidateOwner(registration: Registration, code: InterruptionCode) {
    const running = this.#running;

    if (running !== null && running.attempt.registration === registration) {
      this.#invalidate(running.attempt, { kind: "INTERRUPTED", code });
    }
  }

  #invalidate(attempt: Attempt, invalidation: RecordedInvalidation) {
    if (!attempt.invalidate(invalidation)) {
      return;
    }

    this.#record(attempt.record, {
      type: DIAGNOSTIC_TYPES.ATTEMPT_INVALIDATED,
      context: getInvalidationContext(invalidation),
    });
  }

  #timeOut(running: Running) {
    const { attempt } = running;

    running.blocked = true;
    this.#diagnostics.changed();
    this.#invalidate(attempt, { kind: "INTERRUPTED", code: "TIMED_OUT" });
    this.#record(attempt.record, {
      type: DIAGNOSTIC_TYPES.EXECUTION_BLOCKED,
      context: null,
    });
  }

  #arm(now: number) {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }

    let next = Number.POSITIVE_INFINITY;

    for (const record of this.#records.values()) {
      // A deadline that passed is already handled: ended, or its running attempt invalidated.
      if (record.expiresAt > now) {
        next = Math.min(next, record.expiresAt);
      }

      if (record.current.state === "RETRY_SCHEDULED") {
        next = Math.min(next, record.current.at);
      }
    }

    if (next === Number.POSITIVE_INFINITY) {
      return;
    }

    this.#timer = setTimeout(
      () => {
        this.#timer = null;
        this.#schedule();
      },
      Math.min(Math.max(next - now, 0), MAX_DURATION),
    );
    unrefTimer(this.#timer);
  }

  #publish() {
    const entries = [...this.#records.values()].flatMap((record) => {
      const { current } = record;

      // A record a listener retried mid-turn keeps its last entry until the next turn places it, so it never drops out.
      if (current.state === "ADMITTED") {
        const cached = this.#entries.get(record.id);

        if (cached === undefined) {
          return [];
        }

        return [cached.entry];
      }

      return [this.#getEntry(record, current)];
    });

    const previous = this.#store.get();

    if (
      entries.length === previous.length &&
      entries.every((entry, index) => entry === previous[index])
    ) {
      return;
    }

    Object.freeze(entries);
    this.#store.set(entries);
    this.#diagnostics.changed();
  }

  #getEntry(
    record: IntentRecord,
    current: Exclude<RecordState, { state: "ADMITTED" }>,
  ) {
    const cached = this.#entries.get(record.id);

    if (cached?.revision === record.revision) {
      return cached.entry;
    }

    const entry = getInboxEntry(record, current);

    this.#entries.set(record.id, { revision: record.revision, entry });

    return entry;
  }

  // A persistent record is written whenever its stored state changes; waiting for another reason stays pending.
  #transition(record: IntentRecord, next: RecordState) {
    const previous = record.current;

    record.current = next;
    record.revision += 1;

    if (isWaitingState(previous) && isWaitingState(next)) {
      return null;
    }

    return this.#write(record.definition.persistent);
  }

  #assertRegistered(registration: Registration) {
    if (registration.disposed && this.#state !== "DISPOSED") {
      throw new JunctionError({
        code: "INVALID_CONFIGURATION",
        message:
          "The registration was disposed; subscribe again for a new one.",
      });
    }
  }

  #getAdmissionRefusal(candidate: Candidate): Admission | null {
    if (this.#state === "DISPOSED") {
      return getRejection("disposed", "The Junction was disposed.");
    }

    if (this.#state === "IDLE") {
      return getRejection(
        "not-started",
        "Call junction.start() before dispatching.",
      );
    }

    if (candidate.prepared.definition.persistent && this.#storage === null) {
      return getRejection(
        "storage-unavailable",
        "The storage is blocked; persistent intents wait for storage.reset().",
      );
    }

    return null;
  }

  #write(persistent: boolean) {
    if (!persistent || this.#storage === null) {
      return null;
    }

    return this.#storage.changed();
  }

  #getLifecycleRefusal(): RecoveryResult | null {
    if (this.#state === "DISPOSED") {
      return Object.freeze({ status: "refused", reason: "disposed" });
    }

    if (this.#state === "IDLE") {
      return Object.freeze({ status: "refused", reason: "not-started" });
    }

    return null;
  }

  #record(record: IntentRecord, detail: DiagnosticDetail) {
    this.#diagnostics.record({
      ...detail,
      source: getSourceName(record.provenance),
      intent: record.id,
    });
  }
}
