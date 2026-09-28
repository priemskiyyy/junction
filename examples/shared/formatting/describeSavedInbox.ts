import { formatCount } from "example-shared/formatting/formatCount";
import type { LabStorageState } from "example-shared/storage/types/LabStorageState";

/** What the device's storage holds, in the lab's words. */
export const describeSavedInbox = ({ snapshot, corrupt }: LabStorageState) => {
  if (corrupt) {
    return "The saved inbox is scrambled: whatever reads it gets data no Junction wrote.";
  }

  if (snapshot === null) {
    return "Nothing saved yet.";
  }

  return `Saved inbox: revision ${snapshot.revision}, ${formatCount(snapshot.intents.length, "intent")}.`;
};
