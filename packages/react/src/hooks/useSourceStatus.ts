import type { SourceStatus } from "@priemskiyyy/junction";

import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useJunction } from "src/hooks/useJunction";
import type { RegisteredSourceName } from "src/types/Register";

// Interned so the server snapshot is one reference per render.
const IDLE_STATUS: SourceStatus = Object.freeze({ state: "idle" });

const getServerStatus = () => IDLE_STATUS;

const selectStatus = (status: SourceStatus) => status;

/**
 * Observes one source's status: `attached` once its listener is installed,
 * with how its launch read went, `failed` or `disposed`. It attaches nothing,
 * and reads `idle` on the server and during hydration.
 *
 * @example
 * ```tsx
 * const status = useSourceStatus("links");
 *
 * if (status.state === "failed") {
 *   return <LinksUnavailable />;
 * }
 * ```
 */
export const useSourceStatus = (name: RegisteredSourceName): SourceStatus => {
  const junction = useJunction();

  return useObservableValue(
    junction.source(name).status,
    getServerStatus,
    selectStatus,
  );
};
