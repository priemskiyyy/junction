import type { InboxSnapshot } from "src/types/InboxSnapshot";
import type { InboxStorage } from "src/types/InboxStorage";
import type { StoredIntent } from "src/types/internal/StoredIntent";
import type { StoredLedgerEntry } from "src/types/internal/StoredLedgerEntry";
import type { WriteResult } from "src/types/internal/WriteResult";
import type { StorageStatus } from "src/types/StorageStatus";
import { createId } from "src/utils/common/createId";
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION } from "src/utils/constants/storage";
import { unrefTimer } from "src/utils/internal/runtime/unrefTimer";

type Write = { id: string; snapshot: InboxSnapshot; upTo: number };

type Waiter = { upTo: number; resolve: (result: WriteResult) => void };

export class StorageWriter {
  #storage: InboxStorage;
  #build: () => { intents: StoredIntent[]; ledger: StoredLedgerEntry[] };
  #now: () => number;
  #onChange: () => void;
  #onFailure: () => void;
  #onRelease: () => void;
  #timeout: number;
  #revision: number;
  #changes = 0;
  #written = 0;
  #inflight = false;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #stalled = false;
  #failed: Write | null = null;
  #waiters: Waiter[] = [];
  #disposed = false;

  constructor({
    storage,
    revision,
    build,
    now,
    onChange,
    onFailure,
    onRelease,
    timeout,
  }: {
    storage: InboxStorage;
    revision: number;
    build: () => { intents: StoredIntent[]; ledger: StoredLedgerEntry[] };
    now: () => number;
    onChange: () => void;
    onFailure: () => void;
    onRelease: () => void;
    timeout: number;
  }) {
    this.#storage = storage;
    this.#revision = revision;
    this.#build = build;
    this.#now = now;
    this.#onChange = onChange;
    this.#onFailure = onFailure;
    this.#onRelease = onRelease;
    this.#timeout = timeout;
  }

  // Unconfirmed until a write succeeds again, even while a retry is on its way, so persistent intents keep waiting.
  durability = (): Extract<StorageStatus, { state: "ready" }>["durability"] => {
    if (this.#failed !== null) {
      return "unconfirmed";
    }

    if (this.#inflight || this.#written < this.#changes) {
      return "pending";
    }

    return "committed";
  };

  changed = (): Promise<WriteResult> => {
    this.#changes += 1;

    return this.#wait();
  };

  flush = (): Promise<WriteResult> => this.#wait();

  dispose = () => {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;

    if (this.#timer !== null) {
      clearTimeout(this.#timer);
    }

    // The backend may still commit what is in flight, so nothing is claimed either way.
    for (const { resolve } of this.#waiters.splice(0)) {
      resolve("unconfirmed");
    }

    if (!this.#inflight) {
      this.#onRelease();
    }
  };

  #wait(): Promise<WriteResult> {
    if (this.#disposed || this.#stalled) {
      return Promise.resolve("unconfirmed");
    }

    const upTo = this.#changes;

    if (this.#failed === null && this.#written >= upTo) {
      return Promise.resolve("committed");
    }

    const result = new Promise<WriteResult>((resolve) => {
      this.#waiters.push({ upTo, resolve });
    });

    this.#drain();

    return result;
  }

  #drain() {
    if (this.#inflight || this.#disposed || this.#written >= this.#changes) {
      return;
    }

    const failed = this.#failed;

    const write =
      failed !== null && failed.upTo === this.#changes
        ? failed
        : {
            id: createId(),
            snapshot: this.#getSnapshot(),
            upTo: this.#changes,
          };

    this.#inflight = true;

    const timer = setTimeout(() => this.#stall(write), this.#timeout);

    this.#timer = timer;
    unrefTimer(timer);

    new Promise<void>((resolve) => {
      resolve(this.#storage.replace(write.snapshot, { id: write.id }));
    }).then(
      () => {
        clearTimeout(timer);
        this.#settle(write, "COMMITTED");
      },
      () => {
        clearTimeout(timer);
        this.#settle(write, "FAILED");
      },
    );

    // Announced once the write is on its way, so a listener that disposes meets a write in flight rather than one about to start.
    this.#onChange();
  }

  // A write that outlived its timeout may still commit, so it stays the one in flight and only its waiters are answered.
  #stall(write: Write) {
    if (this.#disposed) {
      return;
    }

    this.#stalled = true;
    this.#failed = write;

    for (const { resolve } of this.#waiters.splice(0)) {
      resolve("unconfirmed");
    }

    this.#onFailure();
    this.#onChange();
  }

  #settle(write: Write, result: "COMMITTED" | "FAILED") {
    const reported = this.#stalled;

    this.#inflight = false;
    this.#stalled = false;

    if (this.#disposed) {
      this.#onRelease();

      return;
    }

    if (result === "FAILED") {
      this.#failed = write;

      // Every waiter learns now: the next attempt waits for flush() or a new change, so a failing storage is never hammered.
      for (const { resolve } of this.#waiters.splice(0)) {
        resolve("unconfirmed");
      }

      if (!reported) {
        this.#onFailure();
      }

      this.#onChange();

      return;
    }

    this.#failed = null;
    this.#written = Math.max(this.#written, write.upTo);

    const waiting: Waiter[] = [];

    for (const waiter of this.#waiters) {
      if (waiter.upTo > this.#written) {
        waiting.push(waiter);

        continue;
      }

      waiter.resolve("committed");
    }

    this.#waiters = waiting;
    this.#drain();
    this.#onChange();
  }

  #getSnapshot(): InboxSnapshot {
    const { intents, ledger } = this.#build();

    this.#revision += 1;
    Object.freeze(intents);
    Object.freeze(ledger);

    return Object.freeze({
      format: SNAPSHOT_FORMAT,
      version: SNAPSHOT_VERSION,
      revision: this.#revision,
      timestamp: this.#now(),
      intents,
      ledger,
    });
  }
}
