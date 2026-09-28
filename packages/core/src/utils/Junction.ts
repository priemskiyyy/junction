import type { Admission } from "src/types/Admission";
import type { BootstrapReport } from "src/types/BootstrapReport";
import type { ConsumerOptions } from "src/types/ConsumerOptions";
import type { DispatchOptions } from "src/types/DispatchOptions";
import type { InboxEntryOf } from "src/types/InboxEntryOf";
import type { InboxStorage } from "src/types/InboxStorage";
import type { InspectionOf } from "src/types/InspectionOf";
import type { IntentDefinition } from "src/types/IntentDefinition";
import type { IntentExecutionOf } from "src/types/IntentExecutionOf";
import type { IntentHandler } from "src/types/IntentHandler";
import type { IntentInput } from "src/types/IntentInput";
import type { IntentPayload } from "src/types/IntentPayload";
import type { IntentRegistration } from "src/types/IntentRegistration";
import type { Intents } from "src/types/Intents";
import type { Candidate } from "src/types/internal/Candidate";
import type { InitialRead } from "src/types/internal/InitialRead";
import type { Receipt } from "src/types/internal/Receipt";
import type { Resolution } from "src/types/internal/Resolution";
import type { WriteResult } from "src/types/internal/WriteResult";
import type { JunctionDiagnostics } from "src/types/JunctionDiagnostics";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { JunctionOptions } from "src/types/JunctionOptions";
import type { JunctionSnapshot } from "src/types/JunctionSnapshot";
import type { ObservableValue } from "src/types/ObservableValue";
import type { RecoveryResult } from "src/types/RecoveryResult";
import type { SourceHandle } from "src/types/SourceHandle";
import type { SourceInput } from "src/types/SourceInput";
import type { SourceNative } from "src/types/SourceNative";
import type { SourceObservation } from "src/types/SourceObservation";
import type { Sources } from "src/types/Sources";
import type { StorageHandle } from "src/types/StorageHandle";
import type { StorageStatus } from "src/types/StorageStatus";
import { createDeferred } from "src/utils/common/createDeferred";
import { createId } from "src/utils/common/createId";
import { ValueStore } from "src/utils/common/ValueStore";
import { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";
import { IDENTIFIER_LENGTH, INBOX_CAPACITY } from "src/utils/constants/limits";
import {
  DISPOSED_STORAGE_STATUS,
  HYDRATING_STORAGE_STATUS,
  IDLE_STORAGE_STATUS,
  NO_STORAGE_STATUS,
} from "src/utils/constants/states";
import { getRegistrationOptions } from "src/utils/internal/consumers/getRegistrationOptions";
import { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";
import { getSnapshotSourceStatus } from "src/utils/internal/diagnostics/getSnapshotSourceStatus";
import { getSourceName } from "src/utils/internal/diagnostics/getSourceName";
import { getSnapshotStorageStatus } from "src/utils/internal/diagnostics/getSnapshotStorageStatus";
import { IdentityBinding } from "src/utils/internal/identity/IdentityBinding";
import { getRejection } from "src/utils/internal/inbox/getRejection";
import { getTypedInbox } from "src/utils/internal/inbox/getTypedInbox";
import { Inbox } from "src/utils/internal/inbox/Inbox";
import { resolveOptions } from "src/utils/internal/options/resolveOptions";
import { resolveDuration } from "src/utils/internal/options/resolveDuration";
import { createRouteBuilders } from "src/utils/internal/routes/createRouteBuilders";
import { getInspection } from "src/utils/internal/routes/getInspection";
import { getTypedInspection } from "src/utils/internal/routes/getTypedInspection";
import { prepareIntent } from "src/utils/internal/routes/prepareIntent";
import { RouteTable } from "src/utils/internal/routes/RouteTable";
import { Clock } from "src/utils/internal/runtime/Clock";
import { resolveSource } from "src/utils/internal/sources/resolveSource";
import { SourceLifetime } from "src/utils/internal/sources/SourceLifetime";
import { disposeStorage } from "src/utils/internal/storage/disposeStorage";
import { StorageRead } from "src/utils/internal/storage/StorageRead";
import { getRestoredInbox } from "src/utils/internal/storage/getRestoredInbox";
import { parseSnapshot } from "src/utils/internal/storage/parseSnapshot";
import { StorageWriter } from "src/utils/internal/storage/StorageWriter";
import { JunctionError } from "src/utils/JunctionError";

type Staged = {
  candidate: Candidate;
  admission: ReturnType<typeof createDeferred<Admission>>;
};

const DISPATCH_PROVENANCE = Object.freeze({ kind: "dispatch" });

const DISPOSED_SOURCES: BootstrapReport["sources"] = [];

Object.freeze(DISPOSED_SOURCES);

const DISPOSED_REPORT: BootstrapReport = Object.freeze({
  state: "disposed",
  storage: "none",
  sources: DISPOSED_SOURCES,
});

const getDurableAdmission = (
  admission: Admission,
  result: WriteResult,
): Admission => {
  if (admission.status !== "accepted" && admission.status !== "duplicate") {
    return admission;
  }

  if (result === "unconfirmed") {
    return Object.freeze({ status: "unconfirmed", intent: admission.intent });
  }

  return Object.freeze({ ...admission, durability: "committed" });
};

const LIFECYCLE_STATES = Object.freeze({
  IDLE: "idle",
  STARTED: "started",
  DISPOSED: "disposed",
} satisfies Record<"IDLE" | "STARTED" | "DISPOSED", JunctionSnapshot["state"]>);

/**
 * Typed application intents from every entry point: captured once by its
 * sources, validated at the boundary, and delivered to the one consumer that
 * owns each intent, once it is ready. Constructing one attaches nothing.
 *
 * @example
 * ```ts
 * export const junction = new Junction({
 *   intents: { openDocument: intent(z.object({ documentId: z.string() })) },
 *   sources: { links: linking({ sdk: Linking }) },
 *   routes: ({ from }) => ({
 *     documentUrl: from.links.url({
 *       url: "https://app.example.com/documents/:documentId",
 *       intent: "openDocument",
 *       payload: ({ params }) => ({ documentId: params.documentId }),
 *     }),
 *   }),
 * });
 *
 * junction.start();
 * ```
 */
export class Junction<
  TIntents extends Intents,
  TSources extends Sources = Record<never, never>,
> {
  #clock: Clock;
  #definitions: Map<string, IntentDefinition<unknown, unknown, boolean>>;
  #routes: RouteTable;
  #identity: IdentityBinding;
  #diagnostics: Diagnostics;
  #inbox: Inbox;
  #lifetimes = new Map<string, SourceLifetime>();
  #handles = new Map<string, SourceHandle<unknown>>();
  #runtime = createId();
  #executionTimeout: number;
  #storageTimeout: number;
  #state: "IDLE" | "STARTED" | "DISPOSED" = "IDLE";
  #started: Promise<BootstrapReport> | null = null;
  #storage: InboxStorage | null;
  #storageStatus: ValueStore<StorageStatus>;
  #writer: StorageWriter | null = null;
  #hydration: Promise<BootstrapReport["storage"]> | null = null;
  #read: StorageRead | null = null;
  #staged: Staged[] | null = null;
  #checkpoint = Number.NEGATIVE_INFINITY;

  constructor(options: JunctionOptions<TIntents, TSources>) {
    const read = resolveOptions(options);

    this.#clock = new Clock(options.now);
    this.#storage = options.storage ?? null;
    this.#storageStatus = new ValueStore<StorageStatus>(
      this.#storage === null ? NO_STORAGE_STATUS : IDLE_STORAGE_STATUS,
    );
    this.#definitions = read.definitions;
    this.#executionTimeout = read.timeout.execution;
    this.#storageTimeout = read.timeout.storage;
    this.#routes = new RouteTable({
      definitions: read.definitions,
      routes: this.#getRoutes(options, [...read.sources.keys()]),
    });
    this.#identity = new IdentityBinding(options.identity);
    this.#diagnostics = new Diagnostics({
      read: () => this.#getSnapshot(),
      // Stamping an event reads a clock, so observing gets its own and can never move Junction time.
      now: new Clock(options.now).now,
    });
    this.#inbox = new Inbox({
      now: this.#clock.now,
      identity: this.#identity,
      diagnostics: this.#diagnostics,
    });

    for (const [name, source] of read.sources) {
      const lifetime = new SourceLifetime({
        name,
        source,
        admit: (observation, receipt) =>
          this.#admitObservation(name, observation, receipt),
        now: this.#clock.now,
        timeout: read.timeout.initial,
        diagnostics: this.#diagnostics,
      });

      this.#lifetimes.set(name, lifetime);
      this.#handles.set(
        name,
        Object.freeze({ status: lifetime.status, native: source.native }),
      );
    }

    this.inbox = getTypedInbox<TIntents>(this.#inbox.entries);
    this.diagnostics = this.#diagnostics.api;
    this.storage = Object.freeze({
      status: Object.freeze({
        get: this.#storageStatus.get,
        subscribe: this.#storageStatus.subscribe,
      }),
      flush: () => this.#flush(),
      reset: () => this.#reset(),
    });
  }

  /**
   * Every intent that has not ended: waiting, running, scheduled for a retry,
   * failed or interrupted, in the order it was accepted. The entries are a
   * union by `name`, so narrowing the name types the payload.
   *
   * @example
   * ```ts
   * const stop = junction.inbox.subscribe(() => render(junction.inbox.get()));
   * ```
   */
  inbox: ObservableValue<InboxEntryOf<TIntents>[]>;

  /**
   * A passive view for devtools: a snapshot of the lifecycle, the identity,
   * every source, consumer and intent, and a timeline of what happened.
   * Observing it attaches, claims and delivers nothing.
   *
   * @example
   * ```ts
   * junction.diagnostics.events.subscribe((event) => console.debug(event.type));
   * ```
   */
  diagnostics: JunctionDiagnostics;

  /**
   * The storage persistent intents survive a restart in: its status, whether
   * the last write committed, `flush()`, which writes every change made so far
   * and retries a failed write, and `reset()` for a blocked one.
   *
   * @example
   * ```ts
   * const status = await junction.storage.flush();
   * ```
   */
  storage: StorageHandle;

  /**
   * Attaches every source synchronously, then restores the stored inbox, and
   * resolves once the storage and each launch read settled or timed out. It
   * never rejects or waits for a deferred link; a later call answers the same
   * promise, and one after `dispose()` answers a disposed report.
   *
   * @example
   * ```ts
   * junction.start();
   * ```
   */
  start = (): Promise<BootstrapReport> => {
    if (this.#state === "DISPOSED") {
      return Promise.resolve(DISPOSED_REPORT);
    }

    if (this.#started !== null) {
      return this.#started;
    }

    // Kept before any listener runs, so a start from inside this one answers the same promise.
    const started = createDeferred<BootstrapReport>();

    this.#started = started.promise;
    this.#state = "STARTED";
    this.#identity.start(this.#handleIdentityChange);

    // Disposed from inside the identity's subscribe or get: what it subscribed is released at once.
    if (this.#state !== "STARTED") {
      this.#identity.dispose();
      started.resolve(DISPOSED_REPORT);

      return started.promise;
    }

    // Sources attach before the storage is read, so what they observe meanwhile stages instead of being missed.
    if (this.#storage === null) {
      this.#inbox.start();
    } else {
      this.#staged = [];
      this.#storageStatus.set(HYDRATING_STORAGE_STATUS);
    }

    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.JUNCTION_STARTED,
      source: null,
      intent: null,
      context: null,
    });

    const reads = Array.from(this.#lifetimes, ([name, lifetime]) =>
      lifetime
        .attach()
        .then((initial): { name: string; initial: InitialRead } =>
          Object.freeze({ name, initial }),
        ),
    );

    const hydration =
      this.#storage === null || this.#state !== "STARTED"
        ? Promise.resolve<BootstrapReport["storage"]>("none")
        : this.#hydrate(this.#storage);

    this.#hydration = hydration;
    this.#diagnostics.changed();
    started.resolve(
      Promise.all([hydration, Promise.all(reads)]).then(
        ([storage, sources]) => {
          Object.freeze(sources);

          return Object.freeze({
            state: this.#state === "DISPOSED" ? "disposed" : "started",
            storage,
            sources,
          });
        },
      ),
    );

    return started.promise;
  };

  /**
   * Registers a consumer of one intent. `match` decides whether it owns an
   * intent and `ready` whether it can run it now; registering starts nothing
   * and delivers nothing until a later scheduler turn.
   *
   * @example
   * ```ts
   * const registration = junction.subscribe("showAnnouncement", ({ announcementId }) => {
   *   announcements.open(announcementId);
   * });
   * ```
   */
  subscribe = <TName extends keyof TIntents & string>(
    name: TName,
    handler: IntentHandler<
      IntentPayload<TIntents[TName]>,
      IntentExecutionOf<TIntents, TName>
    >,
    options: ConsumerOptions<IntentPayload<TIntents[TName]>> = {},
  ): IntentRegistration<
    IntentPayload<TIntents[TName]>,
    IntentExecutionOf<TIntents, TName>
  > => {
    this.#getDefinition(name);

    const registration = this.#inbox.register(
      name,
      getRegistrationOptions(handler, options, this.#executionTimeout),
    );

    return Object.freeze({
      id: registration.id,
      update: (next, nextOptions = {}) =>
        this.#inbox.update(
          registration,
          getRegistrationOptions(next, nextOptions, this.#executionTimeout),
        ),
      dispose: () => this.#inbox.unregister(registration),
    });
  };

  /**
   * Evaluates every consumer's `match` and `ready` again, for closures that
   * read state Junction does not observe; the React binding calls it after
   * every commit. It never throws, and does nothing before `start()` or after
   * `dispose()`.
   *
   * @example
   * ```ts
   * const stopWatching = workspaceStore.subscribe(junction.refresh);
   * ```
   */
  refresh = (): void => this.#inbox.refresh();

  /**
   * Validates and admits an intent the application raises itself. It skips
   * routing, never validation, account binding or limits, and it resolves
   * with the admission, not with the handling.
   *
   * @example
   * ```ts
   * const admission = await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
   * ```
   */
  dispatch = <TName extends keyof TIntents & string>(
    name: TName,
    input: IntentInput<TIntents[TName]>,
    options: DispatchOptions = {},
  ): Promise<Admission> => {
    const definition = this.#getDefinition(name);
    const prepared = prepareIntent(definition, input);

    if (prepared.kind === "REJECTED") {
      const rejection = getRejection(prepared.reason, prepared.issues);

      this.#recordAdmission(rejection, null);

      return Promise.resolve(rejection);
    }

    return Promise.resolve(
      this.#admitPrepared({
        name,
        prepared,
        provenance: DISPATCH_PROVENANCE,
        timestamp: this.#clock.now(),
        interaction:
          options.interaction === undefined
            ? null
            : { channel: ["dispatch"], key: options.interaction.key },
      }),
    );
  };

  /**
   * Explains what one input of a source would become: the route and payload
   * it would produce, or why nothing would. It admits nothing, calls no SDK
   * and works before `start()`.
   *
   * @example
   * ```ts
   * const inspection = junction.inspect("links", { url: "https://app.example.com/documents/42" });
   * ```
   */
  inspect = <TName extends keyof TSources & string>(
    source: TName,
    input: SourceInput<TSources[TName]>,
  ): InspectionOf<TIntents> => {
    resolveSource<TSources, TName>(this.#handles, source);

    return getTypedInspection<TIntents>(
      getInspection(this.#routes.resolve(source, input)),
    );
  };

  /**
   * Moves a failed or interrupted intent back to waiting, after `after`
   * whole milliseconds, with its id, payload, binding and deadline unchanged;
   * an `after` outside its range throws `INVALID_CONFIGURATION`. Retrying an
   * interrupted intent is the application's call about an effect that may
   * have happened.
   *
   * @example
   * ```ts
   * const result = await junction.retry(entry.id, { after: 1_000 });
   * ```
   */
  retry = (
    id: string,
    options: { after?: number | undefined } = {},
  ): Promise<RecoveryResult> => {
    const after = resolveDuration("after", options.after, {
      fallback: 0,
      minimum: 0,
    });

    return this.#runAfterHydration(() => this.#inbox.retry(id, after));
  };

  /**
   * Ends a waiting, failed or interrupted intent as cancelled. A running one
   * is invalidated and answers `requested`: its handler may still finish, and
   * an effect it committed still counts as handled.
   *
   * @example
   * ```ts
   * await junction.cancel(entry.id);
   * ```
   */
  cancel = (id: string): Promise<RecoveryResult> =>
    this.#runAfterHydration(() => this.#inbox.cancel(id));

  /**
   * The escape hatch to one source: its status and the SDK it was given,
   * typed as the application's own. Calls on `native` bypass Junction.
   *
   * @example
   * ```ts
   * const branch = junction.source("referrals").native;
   * ```
   */
  source = <TName extends keyof TSources & string>(
    name: TName,
  ): SourceHandle<SourceNative<TSources[TName]>> =>
    resolveSource<TSources, TName>(this.#handles, name);

  /**
   * Detaches every source, invalidates the running attempt and silences
   * every late callback, synchronously. It never shuts an SDK down, and the
   * inbox keeps its last value; a disposed Junction never starts again.
   *
   * @example
   * ```ts
   * junction.dispose();
   * ```
   */
  dispose = (): void => {
    if (this.#state === "DISPOSED") {
      return;
    }

    this.#state = "DISPOSED";

    for (const lifetime of this.#lifetimes.values()) {
      lifetime.dispose();
    }

    for (const { admission } of this.#staged ?? []) {
      admission.resolve(getRejection("disposed", "The Junction was disposed."));
    }

    this.#staged = null;
    this.#identity.dispose();
    this.#inbox.dispose();
    this.#disposeStorage();
    this.#storageStatus.set(
      this.#storage === null ? NO_STORAGE_STATUS : DISPOSED_STORAGE_STATUS,
    );
    this.#diagnostics.changed();
    this.#diagnostics.dispose();
  };

  #getRoutes(options: JunctionOptions<TIntents, TSources>, sources: string[]) {
    if (options.routes === undefined) {
      return {};
    }

    try {
      return options.routes({
        from: createRouteBuilders<TIntents, TSources>(sources),
      });
    } catch (error) {
      throw new JunctionError({
        code: "INVALID_CONFIGURATION",
        message: "routes threw while declaring the routes.",
        cause: error,
      });
    }
  }

  #getDefinition(name: string) {
    const definition = this.#definitions.get(name);

    if (definition === undefined) {
      throw new JunctionError({
        code: "INVALID_CONFIGURATION",
        message: `The Junction declares no intent named ${JSON.stringify(name)}.`,
      });
    }

    return definition;
  }

  #admitObservation(
    source: string,
    observation: SourceObservation<unknown>,
    receipt: Receipt,
  ): Admission | Promise<Admission> {
    const resolution = this.#routes.resolve(source, observation.input);

    if (resolution.kind !== "MATCHED") {
      const admission = this.#getResolutionAdmission(resolution);

      this.#recordAdmission(admission, source);

      return admission;
    }

    return this.#admitPrepared({
      name: resolution.name,
      prepared: resolution.prepared,
      provenance: Object.freeze({
        kind: "source",
        source: Object.freeze({ name: source }),
        route: Object.freeze({ id: resolution.route }),
        initial: receipt.initial,
        // Stored as it is, so a claim no restore could read back is kept as no claim.
        deferred:
          typeof observation.deferred === "boolean"
            ? observation.deferred
            : null,
      }),
      timestamp: receipt.timestamp,
      interaction:
        observation.interaction === undefined
          ? null
          : {
              channel: [
                "source",
                source,
                observation.interaction.scope === "runtime"
                  ? this.#runtime
                  : "installation",
              ],
              key: observation.interaction.key,
            },
    });
  }

  #admitPrepared({
    interaction,
    ...candidate
  }: Omit<Candidate, "interaction"> & {
    interaction: { channel: string[]; key: string } | null;
  }): Admission | Promise<Admission> {
    // An occurrence key comes from outside, so its length is checked here.
    if (
      interaction !== null &&
      (interaction.key.length === 0 ||
        interaction.key.length > IDENTIFIER_LENGTH)
    ) {
      const rejection = getRejection(
        "invalid-input",
        `An interaction key has 1 to ${IDENTIFIER_LENGTH} characters.`,
      );

      this.#recordAdmission(rejection, getSourceName(candidate.provenance));

      return rejection;
    }

    const staged: Candidate = {
      ...candidate,
      interaction:
        interaction === null
          ? null
          : JSON.stringify([...interaction.channel, interaction.key]),
    };

    if (this.#staged === null) {
      return this.#admitCandidate(staged);
    }

    // Staging holds what arrives while the storage restores, bounded like the inbox itself.
    if (this.#staged.length >= INBOX_CAPACITY) {
      const rejection = getRejection(
        "inbox-full",
        `At most ${INBOX_CAPACITY} intents wait for the storage to restore.`,
      );

      this.#recordAdmission(rejection, getSourceName(candidate.provenance));

      return rejection;
    }

    const admission = createDeferred<Admission>();

    this.#staged.push({ candidate: staged, admission });

    return admission.promise;
  }

  // A receipt stamped before the clock learned its checkpoint is clamped to it, as if Junction time had paused there.
  #admitCandidate(candidate: Candidate): Admission | Promise<Admission> {
    const { admission, write } = this.#inbox.admit({
      ...candidate,
      timestamp: Math.max(candidate.timestamp, this.#checkpoint),
    });

    this.#recordAdmission(admission, getSourceName(candidate.provenance));

    if (write === null) {
      return admission;
    }

    return write.then((result) => getDurableAdmission(admission, result));
  }

  #hydrate(storage: InboxStorage): Promise<BootstrapReport["storage"]> {
    const read = new StorageRead({ storage, timeout: this.#storageTimeout });

    this.#read = read;

    return read.answer().then((answer) => {
      if (answer.kind === "READ") {
        return this.#restore(storage, answer.value);
      }

      if (answer.kind === "DISPOSED") {
        return "none";
      }

      if (answer.kind === "TIMED_OUT") {
        return this.#block(
          new JunctionError({
            code: "STORAGE_READ_FAILED",
            message: "The storage read outlived its timeout.",
          }),
        );
      }

      return this.#block(
        new JunctionError({
          code: "STORAGE_READ_FAILED",
          message: "The storage could not be read.",
          cause: answer.cause,
        }),
      );
    });
  }

  #restore(storage: InboxStorage, value: unknown): BootstrapReport["storage"] {
    if (this.#state === "DISPOSED") {
      return "none";
    }

    const parsed = parseSnapshot(value);

    if (parsed.kind === "REFUSED") {
      return this.#block(
        new JunctionError({ code: parsed.code, message: parsed.message }),
      );
    }

    if (parsed.kind === "EMPTY") {
      this.#createWriter(storage, 0);
      this.#finishHydration();

      return "ready";
    }

    const restored = getRestoredInbox(parsed.intents, this.#definitions);

    this.#clock.advance(parsed.timestamp);
    this.#checkpoint = parsed.timestamp;
    this.#inbox.restore(restored, parsed.ledger);

    for (const { id, reason } of restored.quarantined) {
      this.#diagnostics.record({
        type: DIAGNOSTIC_TYPES.INTENT_QUARANTINED,
        source: null,
        intent: id,
        context: { reason },
      });
    }

    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.STORAGE_HYDRATED,
      source: null,
      intent: null,
      context: {
        restored: restored.records.length,
        quarantined: restored.quarantined.length,
      },
    });
    this.#createWriter(storage, parsed.revision);
    this.#finishHydration();

    return "ready";
  }

  #block(
    error: Extract<StorageStatus, { state: "blocked" }>["error"],
  ): BootstrapReport["storage"] {
    if (this.#state === "DISPOSED") {
      return "none";
    }

    this.#storageStatus.set(
      Object.freeze({ state: "blocked", error: Object.freeze(error) }),
    );
    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.STORAGE_BLOCKED,
      source: null,
      intent: null,
      context: { code: error.code },
    });
    this.#finishHydration();

    return "blocked";
  }

  #finishHydration() {
    const staged = this.#staged ?? [];

    this.#staged = null;
    this.#inbox.start();

    for (const { candidate, admission } of staged) {
      admission.resolve(this.#admitCandidate(candidate));
    }

    this.#diagnostics.changed();
  }

  #createWriter(storage: InboxStorage, revision: number) {
    const writer = new StorageWriter({
      storage,
      revision,
      build: this.#inbox.getStoredState,
      now: this.#clock.now,
      onChange: this.#handleDurabilityChange,
      onFailure: this.#handleWriteFailure,
      onRelease: this.#handleStorageRelease,
      timeout: this.#storageTimeout,
    });

    this.#writer = writer;
    this.#inbox.attachStorage(writer);
    this.#handleDurabilityChange();

    return writer;
  }

  #disposeStorage() {
    const read = this.#read;
    const writer = this.#writer;

    if (read !== null) {
      read.dispose();
    }

    if (writer !== null) {
      writer.dispose();

      return;
    }

    this.#handleStorageRelease();
  }

  // What the storage restores is not in the inbox yet, so a recovery made meanwhile waits for it, as an admission does.
  #runAfterHydration(recover: () => RecoveryResult): Promise<RecoveryResult> {
    if (this.#staged === null) {
      return Promise.resolve(recover());
    }

    return (this.#hydration ?? Promise.resolve()).then(recover);
  }

  #flush(): Promise<StorageStatus> {
    return (this.#hydration ?? Promise.resolve()).then(() => {
      const writer = this.#writer;

      if (writer === null || this.#state === "DISPOSED") {
        return this.#storageStatus.get();
      }

      return writer.flush().then(() => this.#storageStatus.get());
    });
  }

  #reset(): Promise<StorageStatus> {
    return (this.#hydration ?? Promise.resolve()).then(() => {
      const storage = this.#storage;

      if (
        storage === null ||
        this.#state !== "STARTED" ||
        this.#storageStatus.get().state !== "blocked"
      ) {
        return this.#storageStatus.get();
      }

      const writer = this.#createWriter(storage, 0);

      this.#diagnostics.record({
        type: DIAGNOSTIC_TYPES.STORAGE_RESET,
        source: null,
        intent: null,
        context: null,
      });

      // The first write replaces what could not be trusted with the inbox as it stands, which holds no persistent intent.
      return writer.changed().then(() => this.#storageStatus.get());
    });
  }

  #handleDurabilityChange = () => {
    const writer = this.#writer;

    if (writer === null || this.#state === "DISPOSED") {
      return;
    }

    const durability = writer.durability();
    const current = this.#storageStatus.get();

    if (current.state !== "ready" || current.durability !== durability) {
      this.#storageStatus.set(Object.freeze({ state: "ready", durability }));
      this.#diagnostics.changed();
    }

    this.#inbox.storageChanged();
  };

  #handleWriteFailure = () => {
    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.STORAGE_WRITE_FAILED,
      source: null,
      intent: null,
      context: null,
    });
  };

  #handleStorageRelease = () => {
    const storage = this.#storage;
    const read = this.#read;

    if (storage === null) {
      return;
    }

    const release = () =>
      disposeStorage(storage, this.#handleStorageDisposeFailure);

    if (read === null) {
      release();

      return;
    }

    read.whenLanded(release);
  };

  #handleStorageDisposeFailure = () => {
    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.STORAGE_DISPOSE_FAILED,
      source: null,
      intent: null,
      context: null,
    });
  };

  #getResolutionAdmission(
    resolution: Exclude<Resolution, { kind: "MATCHED" }>,
  ): Admission {
    if (resolution.kind === "IGNORED") {
      return Object.freeze({ status: "ignored", reason: resolution.reason });
    }

    return getRejection(resolution.reason, resolution.issues);
  }

  #recordAdmission(admission: Admission, source: string | null) {
    if (admission.status === "accepted") {
      this.#diagnostics.record({
        type: DIAGNOSTIC_TYPES.INTENT_ACCEPTED,
        source,
        intent: admission.intent.id,
        context: null,
      });
      this.#diagnostics.changed();

      return;
    }

    if (admission.status === "duplicate") {
      this.#diagnostics.record({
        type: DIAGNOSTIC_TYPES.INTENT_DUPLICATE,
        source,
        intent: admission.intent.id,
        context: null,
      });

      return;
    }

    if (admission.status === "ignored") {
      this.#diagnostics.record({
        type: DIAGNOSTIC_TYPES.OBSERVATION_IGNORED,
        source,
        intent: null,
        context: { reason: admission.reason },
      });

      return;
    }

    if (admission.status === "rejected") {
      this.#diagnostics.record({
        type: DIAGNOSTIC_TYPES.OBSERVATION_REJECTED,
        source,
        intent: null,
        context: { reason: admission.reason },
      });
    }
  }

  #handleIdentityChange = (previous: JunctionIdentity) => {
    const { status } = this.#identity.current();

    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.IDENTITY_CHANGED,
      source: null,
      intent: null,
      context: { status },
    });

    // The snapshot shows the status only, so a switch between signed-in accounts leaves it as it was.
    if (status !== previous.status) {
      this.#diagnostics.changed();
    }

    this.#inbox.identityChanged();
  };

  #getSnapshot(): JunctionSnapshot {
    const sources = Array.from(this.#lifetimes, ([name, lifetime]) =>
      Object.freeze({
        name,
        adapter: Object.freeze({ name: lifetime.source.name }),
        status: getSnapshotSourceStatus(lifetime.status.get()),
      }),
    );

    Object.freeze(sources);

    return Object.freeze({
      state: LIFECYCLE_STATES[this.#state],
      identity: Object.freeze({ status: this.#identity.current().status }),
      storage: getSnapshotStorageStatus(this.#storageStatus.get()),
      sources,
      ...this.#inbox.getSnapshot(),
    });
  }
}
