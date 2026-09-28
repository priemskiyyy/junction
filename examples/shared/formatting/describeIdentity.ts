import type { JunctionIdentity } from "@priemskiyyy/junction";
import { match } from "ts-pattern";

import { getPersonName } from "example-shared/formatting/getPersonName";

/** Who is signed in, in the lab's words. */
export const describeIdentity = (identity: JunctionIdentity) =>
  match(identity)
    .with({ status: "restoring" }, () => "Folio is restoring who is signed in")
    .with({ status: "anonymous" }, () => "Nobody is signed in")
    .with(
      { status: "authenticated" },
      ({ account }) => `${getPersonName(account.id)} signed in`,
    )
    .exhaustive();
