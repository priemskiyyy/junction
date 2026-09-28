import { Platform } from "react-native";

/** The monospace family each platform ships, for URLs, ids and times. */
export const MONOSPACE = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "ui-monospace, SFMono-Regular, Menlo, monospace",
});
