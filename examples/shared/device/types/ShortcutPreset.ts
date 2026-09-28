/** A home screen shortcut Folio registers with `setItems()`: the action expo-quick-actions reports, and its title. */
export type ShortcutPreset = {
  title: string;
  action: {
    id: string;
    params: Record<string, string> | null;
  };
};
