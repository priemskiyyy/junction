import type { SourceObservation } from "@priemskiyyy/junction";

import type { QuickActionInput } from "src/types/QuickActionInput";
import type { QuickActionLike } from "src/types/QuickActionLike";

export const getActionObservation = ({
  id,
  params,
}: QuickActionLike): SourceObservation<QuickActionInput> => ({
  input: { action: { id, params: params ?? {} } },
});
