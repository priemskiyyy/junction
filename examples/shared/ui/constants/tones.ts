import type {
  JunctionDiagnosticType,
  StorageStatus,
} from "@priemskiyyy/junction";
import { match } from "ts-pattern";

import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";
import type { StorageWrite } from "example-shared/storage/types/StorageWrite";
import type { Tone } from "example-shared/types/Tone";

/** The tone of each diagnostic event's line in the timeline. */
export const EVENT_TONES = {
  "junction started": "positive",
  "junction disposed": "neutral",
  "identity changed": "accent",
  "source attached": "neutral",
  "source failed": "danger",
  "source error": "danger",
  "source dispose failed": "danger",
  "initial read settled": "info",
  "callback ignored": "warning",
  "observation ignored": "neutral",
  "observation rejected": "danger",
  "intent accepted": "positive",
  "intent duplicate": "warning",
  "intent waiting": "warning",
  "attempt started": "info",
  "attempt invalidated": "danger",
  "effect committed": "accent",
  "execution blocked": "danger",
  "intent acknowledged": "positive",
  "intent rejected": "danger",
  "intent failed": "danger",
  "intent interrupted": "danger",
  "retry scheduled": "warning",
  "intent expired": "neutral",
  "intent cancelled": "neutral",
  "intent quarantined": "warning",
  "storage hydrated": "info",
  "storage blocked": "danger",
  "storage write failed": "danger",
  "storage reset": "info",
  "storage dispose failed": "danger",
} satisfies Record<JunctionDiagnosticType, Tone>;

/** The tone of an inbox entry's state badge. */
export const ENTRY_TONES = {
  pending: "warning",
  leased: "info",
  "retry-scheduled": "warning",
  failed: "danger",
  interrupted: "danger",
} satisfies Record<FolioInboxEntry["state"], Tone>;

/** The tone of the storage badge, from what the storage says. */
export const getStorageTone = (status: StorageStatus): Tone =>
  match(status)
    .with({ state: "ready", durability: "committed" }, (): Tone => "positive")
    .with({ state: "ready", durability: "pending" }, (): Tone => "info")
    .with({ state: "ready", durability: "unconfirmed" }, (): Tone => "danger")
    .with({ state: "blocked" }, (): Tone => "danger")
    .with({ state: "hydrating" }, (): Tone => "info")
    .with(
      { state: "none" },
      { state: "idle" },
      { state: "disposed" },
      (): Tone => "neutral",
    )
    .exhaustive();

/** The tone of a storage write's badge. */
export const WRITE_TONES = {
  committed: "positive",
  failed: "danger",
} satisfies Record<StorageWrite["status"], Tone>;
