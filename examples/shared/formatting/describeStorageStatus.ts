import type { StorageStatus } from "@priemskiyyy/junction";
import { match } from "ts-pattern";

import { ERROR_WORDS } from "example-shared/formatting/constants/errorWords";

/** What Junction says about its storage, in the lab's words. */
export const describeStorageStatus = (status: StorageStatus) =>
  match(status)
    .with({ state: "none" }, () => "No storage")
    .with({ state: "idle" }, () => "Not read yet")
    .with({ state: "hydrating" }, () => "Reading the saved inbox")
    .with({ state: "ready", durability: "committed" }, () => "Up to date")
    .with({ state: "ready", durability: "pending" }, () => "Writing")
    .with(
      { state: "ready", durability: "unconfirmed" },
      () => "Unconfirmed: the last write failed",
    )
    .with(
      { state: "blocked" },
      ({ error }) => `Blocked: ${ERROR_WORDS[error.code]}`,
    )
    .with({ state: "disposed" }, () => "Stopped: Folio quit")
    .exhaustive();
