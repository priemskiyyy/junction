import type { AdjustConfigLike } from "@priemskiyyy/junction-adjust";
import type { NotificationsLike } from "@priemskiyyy/junction-expo-notifications";
import type { QuickActionsLike } from "@priemskiyyy/junction-expo-quick-actions";
import type { LinkingLike } from "@priemskiyyy/junction-react-native";

/** The SDKs Folio's Junction listens to: the lab's simulated ones, or the real modules on a device. */
export type FolioSdks = {
  linking: LinkingLike;
  notifications: NotificationsLike;
  quickActions: QuickActionsLike;
  adjust: AdjustConfigLike;
};
