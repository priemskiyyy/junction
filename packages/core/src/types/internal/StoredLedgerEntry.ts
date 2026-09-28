export type StoredLedgerEntry = {
  key: string;
  fingerprint: string;
  intent: { id: string };
  timestamp: number;
};
