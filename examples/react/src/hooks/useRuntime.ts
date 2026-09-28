import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

/** The launch of Folio the page shows: the running one, or the last one after Folio quit. */
export const useRuntime = () => useObservable(useLab().runtime);
