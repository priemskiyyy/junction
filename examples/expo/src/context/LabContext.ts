import { createContext } from "react";

import type { IntentLab } from "example-shared/lab/types/IntentLab";

/** The lab every component reads its stores and controls from. */
export const LabContext = createContext<IntentLab | null>(null);
