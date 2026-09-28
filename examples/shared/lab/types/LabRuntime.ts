import type { BootstrapReport } from "@priemskiyyy/junction";

import type { DeviceProcess } from "example-shared/device/types/DeviceProcess";
import type { LaunchVia } from "example-shared/device/types/LaunchVia";
import type { FolioApp } from "example-shared/folio/types/FolioApp";
import type { FolioJunction } from "example-shared/junction/types/FolioJunction";

/** One launch of Folio: its process on the device, its app state and its Junction. A launch that quit keeps its disposed Junction, whose inbox shows how it stopped. */
export type LabRuntime = {
  id: number;
  /** Which launch of Folio this is, counting from one. */
  number: number;
  state: "running" | "quit";
  via: LaunchVia;
  process: DeviceProcess;
  app: FolioApp;
  junction: FolioJunction;
  report: BootstrapReport | null;
};
