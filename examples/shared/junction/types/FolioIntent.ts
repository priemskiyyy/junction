import type { IntentPayload } from "@priemskiyyy/junction";

import type { FolioIntents } from "example-shared/junction/types/FolioIntents";

/** One of Folio's intents with its typed payload: an inbox entry or an execution narrows to it by `name`. */
export type FolioIntent = {
  [TName in keyof FolioIntents]: {
    name: TName;
    payload: IntentPayload<FolioIntents[TName]>;
  };
}[keyof FolioIntents];
