import type { FolioBanner } from "example-shared/folio/types/FolioBanner";
import type { PaneState } from "example-shared/folio/types/PaneState";

/** What Folio shows: its panes, two in split view, and its banner. */
export type NavigationState = {
  panes: PaneState[];
  banner: FolioBanner | null;
};
