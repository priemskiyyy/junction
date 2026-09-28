/** The adapter name the source reports in diagnostics. */
export const DETOUR_ADAPTER = "detour";

/** The links Detour's facade hands on, which one source of a Junction may claim. */
export const DETOUR_RESOURCE = "detour";

/** The two parameters Detour appends, last and in this order, to every URL it hands on. */
export const DETOUR_PARAMETERS =
  /[?&]fromDeepLink=true&linkType=(deferred|verified|scheme)$/;
