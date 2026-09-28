import { SOURCE_LABELS } from "example-shared/junction/constants/sources";
import type { FolioSourceName } from "example-shared/junction/types/FolioSourceName";

const isFolioSourceName = (name: string): name is FolioSourceName =>
  name in SOURCE_LABELS;

/** A source's name, as diagnostics report it, in the words of its entry point. */
export const getSourceLabel = (name: string) => {
  if (!isFolioSourceName(name)) {
    return name;
  }

  return SOURCE_LABELS[name];
};
