import type { JunctionDiagnosticEvent } from "@priemskiyyy/junction";

/** Why a saved intent was set aside when the inbox was restored, in the lab's words. */
export const QUARANTINE_WORDS = {
  "unknown-intent": "Folio no longer has that intent",
  "not-persistent": "that intent no longer persists",
  "unsupported-version": "it was saved by another version",
  "binding-mismatch": "its account binding changed",
  "invalid-payload": "its payload no longer fits the schema",
} satisfies Record<
  JunctionDiagnosticEvent<"intent quarantined">["context"]["reason"],
  string
>;
