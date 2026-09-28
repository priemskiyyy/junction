import type { FolioSourceName } from "example-shared/junction/types/FolioSourceName";

/** Each source in the words of the entry point it listens to. */
export const SOURCE_LABELS: Record<FolioSourceName, string> = {
  links: "Links",
  notifications: "Notifications",
  shortcuts: "Home screen shortcuts",
  installs: "Adjust deferred links",
};

/** The adapter package behind each source. */
export const SOURCE_PACKAGES: Record<FolioSourceName, string> = {
  links: "@priemskiyyy/junction-react-native",
  notifications: "@priemskiyyy/junction-expo-notifications",
  shortcuts: "@priemskiyyy/junction-expo-quick-actions",
  installs: "@priemskiyyy/junction-adjust",
};
