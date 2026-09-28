import type { Icon } from "phosphor-react-native";
import { Flask, HandTap, Rows, Tray } from "phosphor-react-native";

import type { TabId } from "src/types/TabId";

/** The lab's tabs, in the order the tab bar shows them. */
export const TABS: { id: TabId; label: string; icon: Icon }[] = [
  { id: "try", label: "Try", icon: HandTap },
  { id: "inbox", label: "Inbox", icon: Tray },
  { id: "timeline", label: "Timeline", icon: Rows },
  { id: "break", label: "Break", icon: Flask },
];
