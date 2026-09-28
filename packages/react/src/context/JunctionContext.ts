import { createContext } from "react";

import type { RegisteredJunction } from "src/types/Register";

export const JunctionContext = createContext<RegisteredJunction | undefined>(
  undefined,
);
