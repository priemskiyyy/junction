import type { StoredLedgerEntry } from "src/types/internal/StoredLedgerEntry";
import { LEDGER_CAPACITY, LEDGER_RETENTION } from "src/utils/constants/limits";

type Entry = { intent: string; fingerprint: string; persistent: boolean };

export class InteractionLedger {
  #entries = new Map<string, Entry>();
  #settled = new Map<string, number>();

  find = (key: string, now: number) => {
    this.#prune(now);

    return this.#entries.get(key);
  };

  reserve = (key: string, entry: Entry) => {
    this.#entries.set(key, entry);
  };

  settle = (key: string, timestamp: number) => {
    this.#settled.set(key, timestamp);
    this.#prune(timestamp);
  };

  getStoredEntries = (now: number): StoredLedgerEntry[] => {
    this.#prune(now);

    return [...this.#settled].flatMap(([key, timestamp]) => {
      const entry = this.#entries.get(key);

      if (entry === undefined || !entry.persistent) {
        return [];
      }

      return [
        Object.freeze({
          key,
          fingerprint: entry.fingerprint,
          intent: Object.freeze({ id: entry.intent }),
          timestamp,
        }),
      ];
    });
  };

  restore = (entries: StoredLedgerEntry[], now: number) => {
    for (const { key, fingerprint, intent, timestamp } of entries) {
      this.#entries.set(key, {
        intent: intent.id,
        fingerprint,
        persistent: true,
      });
      this.#settled.set(key, timestamp);
    }

    this.#prune(now);
  };

  // A settled entry keeps deduplicating for a day, and the oldest go first past the cap; open ones are never evicted.
  #prune(now: number) {
    for (const [key, settledAt] of this.#settled) {
      if (
        this.#settled.size <= LEDGER_CAPACITY &&
        now - settledAt < LEDGER_RETENTION
      ) {
        return;
      }

      this.#settled.delete(key);
      this.#entries.delete(key);
    }
  }
}
