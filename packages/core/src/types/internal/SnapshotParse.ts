import type { RestorableIntent } from "src/types/internal/RestorableIntent";
import type { StoredLedgerEntry } from "src/types/internal/StoredLedgerEntry";

export type SnapshotParse =
  | { kind: "EMPTY" }
  | {
      kind: "PARSED";
      revision: number;
      timestamp: number;
      intents: RestorableIntent[];
      ledger: StoredLedgerEntry[];
    }
  | {
      kind: "REFUSED";
      code: "STORAGE_CORRUPT" | "STORAGE_VERSION_UNSUPPORTED";
      message: string;
    };
