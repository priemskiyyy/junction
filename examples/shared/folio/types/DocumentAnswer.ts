import type { FolioDocument } from "example-shared/folio/types/FolioDocument";

/** What Folio's document service answers when a handler asks for a document. */
export type DocumentAnswer =
  | { status: "found"; document: FolioDocument }
  | { status: "no-access" }
  | { status: "missing" };
