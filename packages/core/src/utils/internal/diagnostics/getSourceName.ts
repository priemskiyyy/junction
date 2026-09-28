import type { IntentProvenance } from "src/types/IntentProvenance";

export const getSourceName = (provenance: IntentProvenance) => {
  if (provenance.kind !== "source") {
    return null;
  }

  return provenance.source.name;
};
