import { JunctionError } from "@priemskiyyy/junction";
import { useContext } from "react";

import { JunctionContext } from "src/context/JunctionContext";
import type { RegisteredJunction } from "src/types/Register";

/**
 * Returns the nearest provider's Junction, attaching and claiming nothing, and
 * throws when there is no provider. Augment `Register` to type it.
 *
 * @example
 * ```tsx
 * const junction = useJunction();
 *
 * const handleSharePress = () => junction.dispatch("openDocument", { workspaceId, documentId });
 * ```
 */
export const useJunction = (): RegisteredJunction => {
  const junction = useContext(JunctionContext);

  if (junction === undefined) {
    throw new JunctionError({
      code: "INVALID_CONFIGURATION",
      message: "Junction hooks must be used within a JunctionProvider.",
    });
  }

  return junction;
};
