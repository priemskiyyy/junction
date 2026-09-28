import type { InboxEntry } from "src/types/InboxEntry";
import type { InboxEntryOf } from "src/types/InboxEntryOf";
import type { ObservableValue } from "src/types/ObservableValue";

// The overload restores the name-to-payload relation that one table of every intent's records erases.
export function getTypedInbox<TIntents>(
  inbox: ObservableValue<InboxEntry<string, unknown>[]>,
): ObservableValue<InboxEntryOf<TIntents>[]>;

export function getTypedInbox(
  inbox: ObservableValue<InboxEntry<string, unknown>[]>,
): ObservableValue<InboxEntry<string, unknown>[]> {
  return inbox;
}
