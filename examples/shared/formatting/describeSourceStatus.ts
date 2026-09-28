import type { SourceStatus } from "@priemskiyyy/junction";
import { match, P } from "ts-pattern";

import { LAUNCH_READ_WORDS } from "example-shared/formatting/constants/launchReadWords";

/** A source's status, and how its launch read went, in the lab's words. */
export const describeSourceStatus = (status: SourceStatus) =>
  match(status)
    .with({ state: "idle" }, () => "Not attached yet")
    .with(
      { state: "attached", initial: "pending" },
      () => "Listening, launch read pending",
    )
    .with(
      { state: "attached", initial: P.not("pending") },
      ({ initial }) =>
        `Listening; the launch read ${LAUNCH_READ_WORDS[initial]}`,
    )
    .with({ state: "failed" }, () => "Failed to attach")
    .with({ state: "disposed" }, () => "Stopped listening")
    .exhaustive();
