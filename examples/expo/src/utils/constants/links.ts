import { Platform } from "react-native";

import type { Tone } from "example-shared/types/Tone";

/** The links the app opens through the OS: Folio's own scheme, since an https link needs Universal Links this example does not set up. */
export const APP_LINKS = [
  { label: "Brand brief", url: "folio://open/design/brand-brief" },
  { label: "Launch plan", url: "folio://open/design/launch-plan" },
  { label: "Q3 budget", url: "folio://open/finance/q3-budget" },
  { label: "Invoice run", url: "folio://open/finance/invoice-run" },
];

/** How the links reach Folio here: through the device's own Linking, or simulated on the web, where the URL belongs to the router. */
export const LINKS_ROUTE: {
  badge: { label: string; tone: Tone };
  hint: string;
} = Platform.select({
  web: {
    badge: { label: "Simulated", tone: "neutral" },
    hint: "Simulated on the web, where the page's URL belongs to the router, not to Junction.",
  },
  default: {
    badge: { label: "Real", tone: "positive" },
    hint: "Opened with this device's own Linking: the operating system hands each link back to Folio, and the links source routes it.",
  },
});
