import type { ShortcutPreset } from "example-shared/device/types/ShortcutPreset";

/** The shortcuts Folio registers on its home screen icon. */
export const SHORTCUTS: ShortcutPreset[] = [
  {
    title: "New document",
    action: { id: "new-document", params: { template: "blank" } },
  },
  {
    title: "Meeting notes",
    action: { id: "meeting-notes", params: { template: "meeting-notes" } },
  },
  { title: "Search", action: { id: "search", params: null } },
];
