import { match } from "ts-pattern";

import { getPersonName } from "example-shared/formatting/getPersonName";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";

/** Whom an intent runs for: anyone, whoever signs in, or the one person it is bound to. */
export const describeBinding = (binding: FolioInboxEntry["binding"]) =>
  match(binding)
    .with({ kind: "public" }, () => "anyone")
    .with({ kind: "unbound" }, () => "whoever signs in")
    .with({ kind: "bound" }, ({ account }) => getPersonName(account.id))
    .exhaustive();
