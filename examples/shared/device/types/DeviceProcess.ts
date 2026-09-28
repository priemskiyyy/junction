import type { Device } from "example-shared/device/types/Device";

/** One launch of Folio on the device, with the SDKs that launch's Junction listens to. */
export type DeviceProcess = ReturnType<Device["startProcess"]>;
