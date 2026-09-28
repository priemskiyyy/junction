import type { NotificationResponseLike } from "@priemskiyyy/junction-expo-notifications";
import type { QuickActionLike } from "@priemskiyyy/junction-expo-quick-actions";

/** What started a launch of Folio: its icon, or an entry point while it was not running. */
export type LaunchVia =
  | { kind: "icon" }
  | { kind: "link"; url: string }
  | { kind: "notification"; response: NotificationResponseLike }
  | { kind: "shortcut"; action: QuickActionLike };
