import type { SourceObservation } from "@priemskiyyy/junction";

import type { DetourInput } from "src/types/DetourInput";
import { DETOUR_PARAMETERS } from "src/utils/constants/detour";

export const getDetourObservation = (
  url: string,
): SourceObservation<DetourInput> => {
  const match = DETOUR_PARAMETERS.exec(url);

  if (match === null) {
    return { input: { url } };
  }

  return {
    input: { url: url.slice(0, match.index) },
    deferred: match[1] === "deferred",
  };
};
