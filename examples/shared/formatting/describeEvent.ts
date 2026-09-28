import type {
  JunctionDiagnosticEvent,
  JunctionIdentity,
} from "@priemskiyyy/junction";
import { match } from "ts-pattern";

import { ERROR_WORDS } from "example-shared/formatting/constants/errorWords";
import { IGNORED_WORDS } from "example-shared/formatting/constants/ignoredWords";
import { LAUNCH_READ_WORDS } from "example-shared/formatting/constants/launchReadWords";
import { QUARANTINE_WORDS } from "example-shared/formatting/constants/quarantineWords";
import { REJECTION_WORDS } from "example-shared/formatting/constants/rejectionWords";
import { WAITING_WORDS } from "example-shared/formatting/constants/waitingWords";
import { describeIdentity } from "example-shared/formatting/describeIdentity";
import { formatDuration } from "example-shared/formatting/formatDuration";
import { getSourceLabel } from "example-shared/formatting/getSourceLabel";

const describeInvalidation = (
  context: JunctionDiagnosticEvent<"attempt invalidated">["context"],
) => {
  if (context.reason === "interrupted") {
    return ERROR_WORDS[context.code];
  }

  if (context.reason === "expired") {
    return "its deadline passed";
  }

  return "it was cancelled";
};

/** One diagnostic event as a line of the timeline; the page puts the intent it is about beside it. */
export const describeEvent = (
  event: JunctionDiagnosticEvent,
  identity: JunctionIdentity,
) => {
  const source =
    event.source === null ? "Junction" : getSourceLabel(event.source.name);

  return match(event)
    .with(
      { type: "junction started" },
      () => "Junction started: every source listens",
    )
    .with(
      { type: "junction disposed" },
      () => "Junction disposed: every source stopped listening",
    )
    .with({ type: "identity changed" }, () => describeIdentity(identity))
    .with({ type: "source attached" }, () => `${source} attached`)
    .with({ type: "source failed" }, () => `${source} failed to attach`)
    .with({ type: "source error" }, () => `${source} reported an error`)
    .with(
      { type: "source dispose failed" },
      () => `${source} failed to stop listening`,
    )
    .with({ type: "initial read settled" }, ({ context }) => {
      const words = `${source}: the launch read ${LAUNCH_READ_WORDS[context.initial]}`;

      if (context.late) {
        return `${words}, after its timeout`;
      }

      return words;
    })
    .with(
      { type: "callback ignored" },
      () => `${source} called back after it stopped, and Junction ignored it`,
    )
    .with(
      { type: "observation ignored" },
      ({ context }) =>
        `${source}: ${IGNORED_WORDS[context.reason]}, so nothing was admitted`,
    )
    .with(
      { type: "observation rejected" },
      ({ context }) =>
        `${source}: refused, since ${REJECTION_WORDS[context.reason]}`,
    )
    .with({ type: "intent accepted" }, () => {
      if (event.source === null) {
        return "Dispatched from inside Folio, and accepted";
      }

      return `Accepted from ${source}`;
    })
    .with(
      { type: "intent duplicate" },
      () => "The same occurrence again, so it stays one intent",
    )
    .with(
      { type: "intent waiting" },
      ({ context }) => `Waits, since ${WAITING_WORDS[context.reason]}`,
    )
    .with(
      { type: "attempt started" },
      ({ context }) => `Attempt ${context.attempt.number} started`,
    )
    .with(
      { type: "attempt invalidated" },
      ({ context }) =>
        `Attempt invalidated, since ${describeInvalidation(context)}`,
    )
    .with({ type: "effect committed" }, () => "Effect committed")
    .with(
      { type: "execution blocked" },
      () => "Outlived its timeout and holds the slot",
    )
    .with({ type: "intent acknowledged" }, () => "Handled")
    .with(
      { type: "intent rejected" },
      ({ context }) => `Its handler rejected it: ${context.reason}`,
    )
    .with(
      { type: "intent failed" },
      ({ context }) => `Failed, since ${ERROR_WORDS[context.code]}`,
    )
    .with(
      { type: "intent interrupted" },
      ({ context }) =>
        `Interrupted, since ${ERROR_WORDS[context.code]}; the effect may have happened`,
    )
    .with(
      { type: "retry scheduled" },
      ({ context }) => `Retries in ${formatDuration(context.after)}`,
    )
    .with({ type: "intent expired" }, ({ context }) => {
      if (context.running) {
        return "Expired while its handler ran, so the effect may have happened";
      }

      return "Expired, and it will never run";
    })
    .with({ type: "intent cancelled" }, ({ context }) => {
      if (context.running) {
        return "Cancelled while its handler ran, so the effect may have happened";
      }

      return "Cancelled";
    })
    .with(
      { type: "intent quarantined" },
      ({ context }) =>
        `A saved intent was set aside, since ${QUARANTINE_WORDS[context.reason]}`,
    )
    .with(
      { type: "storage hydrated" },
      ({ context }) => `Storage restored ${context.restored} saved intents`,
    )
    .with(
      { type: "storage blocked" },
      ({ context }) => `Storage blocked, since ${ERROR_WORDS[context.code]}`,
    )
    .with(
      { type: "storage write failed" },
      () =>
        "A storage write failed; persistent intents wait for one to succeed",
    )
    .with(
      { type: "storage reset" },
      () => "Storage reset: the next write replaces the saved inbox",
    )
    .with(
      { type: "storage dispose failed" },
      () => "The storage failed to close",
    )
    .exhaustive();
};
