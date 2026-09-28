import type { IntentProvenance } from "@priemskiyyy/junction";
import { match } from "ts-pattern";

import { describeDeferral } from "example-shared/formatting/describeDeferral";
import { getSourceLabel } from "example-shared/formatting/getSourceLabel";

/** Where an intent came from, as tags: its source, its route, a launch read, and the provider's claim about deferral. */
export const describeProvenance = (provenance: IntentProvenance): string[] =>
  match(provenance)
    .with({ kind: "dispatch" }, () => ["Dispatched inside Folio"])
    .with({ kind: "source" }, ({ source, route, initial, deferred }) => [
      getSourceLabel(source.name),
      `route ${route.id}`,
      ...(initial ? ["launch read"] : []),
      ...describeDeferral(deferred),
    ])
    .exhaustive();
