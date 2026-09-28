import type { Inspection } from "src/types/Inspection";
import type { InspectionOf } from "src/types/InspectionOf";

// The overload restores the name-to-payload relation that one route table of every intent erases.
export function getTypedInspection<TIntents>(
  inspection: Inspection,
): InspectionOf<TIntents>;

export function getTypedInspection(inspection: Inspection): Inspection {
  return inspection;
}
