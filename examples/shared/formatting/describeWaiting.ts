import { match } from "ts-pattern";

import { describeBinding } from "example-shared/formatting/describeBinding";
import { describeConsumers } from "example-shared/formatting/describeConsumers";
import type { PendingEntry } from "example-shared/junction/types/PendingEntry";

/** Why a waiting intent waits, and what would let it run. */
export const describeWaiting = ({ waiting, binding }: PendingEntry) =>
  match(waiting.reason)
    .with(
      "no-consumer",
      () => "No screen takes it yet, so it waits until one mounts.",
    )
    .with(
      "ambiguous-consumer",
      () =>
        `${describeConsumers(waiting.consumers)} both claim it, so Junction waits instead of choosing by mount order.`,
    )
    .with(
      "consumer-not-ready",
      () =>
        `${describeConsumers(waiting.consumers)} owns it but is not ready, and no other screen gets it meanwhile.`,
    )
    .with(
      "readiness-error",
      () =>
        `${describeConsumers(waiting.consumers)} threw from its ready check.`,
    )
    .with("selection-error", () => "A screen threw from its match check.")
    .with(
      "identity-restoring",
      () => "Folio is still restoring who is signed in.",
    )
    .with(
      "authentication",
      () => `It is for ${describeBinding(binding)}, and nobody is signed in.`,
    )
    .with(
      "account-mismatch",
      () =>
        `It is for ${describeBinding(binding)}, and someone else is signed in.`,
    )
    .with("capacity", () => "Another intent holds the one execution slot.")
    .with(
      "storage",
      () =>
        "Storage has not confirmed a write, and it will not run on a lease that may not be saved.",
    )
    .exhaustive();
