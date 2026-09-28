import type { DiagnosticRecord } from "src/types/internal/DiagnosticRecord";
import type { JunctionDiagnosticEvent } from "src/types/JunctionDiagnosticEvent";
import type { JunctionDiagnostics } from "src/types/JunctionDiagnostics";
import type { JunctionSnapshot } from "src/types/JunctionSnapshot";
import { isolate } from "src/utils/common/isolate";
import { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";

type State =
  | {
      state: "ACTIVE";
      read: () => JunctionSnapshot;
      snapshot: JunctionSnapshot | null;
    }
  | { state: "DISPOSED"; snapshot: JunctionSnapshot };

export class Diagnostics {
  #state: State;
  #now: () => number;
  #listeners = new Set<() => void>();
  #eventListeners = new Set<(event: JunctionDiagnosticEvent) => void>();
  #pending: JunctionDiagnosticEvent[] = [];
  #delivering = false;
  #scheduled = false;

  constructor({
    read,
    now,
  }: {
    read: () => JunctionSnapshot;
    now: () => number;
  }) {
    this.#state = { state: "ACTIVE", read, snapshot: null };
    this.#now = now;
  }

  api: JunctionDiagnostics = Object.freeze({
    get: () => {
      const state = this.#state;

      if (state.state === "DISPOSED") {
        return state.snapshot;
      }

      if (state.snapshot === null) {
        state.snapshot = state.read();
      }

      return state.snapshot;
    },
    subscribe: (listener: () => void) => {
      if (this.#state.state === "DISPOSED") {
        return () => {};
      }

      const subscription = () => listener();

      this.#listeners.add(subscription);

      return () => {
        this.#listeners.delete(subscription);
      };
    },
    events: Object.freeze({
      subscribe: (listener: (event: JunctionDiagnosticEvent) => void) => {
        if (this.#state.state === "DISPOSED") {
          return () => {};
        }

        const subscription = (event: JunctionDiagnosticEvent) =>
          listener(event);

        this.#eventListeners.add(subscription);

        return () => {
          this.#eventListeners.delete(subscription);
        };
      },
    }),
  });

  record = (record: DiagnosticRecord) => {
    if (this.#eventListeners.size === 0 || this.#state.state === "DISPOSED") {
      return;
    }

    this.#pending.push(this.#getEvent(record));
    this.#deliver();
  };

  changed = () => {
    if (this.#state.state === "DISPOSED") {
      return;
    }

    this.#state.snapshot = null;

    if (this.#listeners.size === 0 || this.#scheduled) {
      return;
    }

    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.#notify();
    });
  };

  dispose = () => {
    if (this.#state.state === "DISPOSED") {
      return;
    }

    this.#state = { state: "DISPOSED", snapshot: this.#state.read() };

    if (this.#eventListeners.size > 0) {
      this.#pending.push(
        this.#getEvent({
          type: DIAGNOSTIC_TYPES.JUNCTION_DISPOSED,
          source: null,
          intent: null,
          context: null,
        }),
      );
    }

    this.#deliver();
    this.#notify();
    this.#listeners.clear();
  };

  #getEvent(record: DiagnosticRecord): JunctionDiagnosticEvent {
    Object.freeze(record.context);

    return Object.freeze({
      ...record,
      source:
        record.source === null ? null : Object.freeze({ name: record.source }),
      intent:
        record.intent === null ? null : Object.freeze({ id: record.intent }),
      timestamp: this.#now(),
    });
  }

  #deliver() {
    if (this.#delivering) {
      return;
    }

    this.#delivering = true;

    // A listener may record more; they join this pass in order.
    for (const event of this.#pending) {
      for (const listener of [...this.#eventListeners]) {
        if (this.#eventListeners.has(listener)) {
          isolate(() => listener(event));
        }
      }
    }

    this.#pending = [];
    this.#delivering = false;

    if (this.#state.state === "DISPOSED") {
      this.#eventListeners.clear();
    }
  }

  #notify() {
    for (const listener of [...this.#listeners]) {
      if (this.#listeners.has(listener)) {
        isolate(listener);
      }
    }
  }
}
