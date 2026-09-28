import type { LinkingLike } from "@priemskiyyy/junction-react-native";

/** A device's own Linking, for the lab on a real phone: the module the links source listens to, and how the lab asks the OS to open a link. */
export type RealLinking = {
  sdk: LinkingLike;
  open: (url: string) => void;
};
