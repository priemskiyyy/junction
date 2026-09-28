import type { SdkName } from "example-shared/device/types/SdkName";

/** One call Folio's code made into an SDK on the device, with what it answered. */
export type SdkCall = {
  id: number;
  timestamp: number;
  sdk: SdkName;
  call: string;
  answer: string | null;
  /** Who called: a Junction adapter, which only listens, or Folio's own code, which owns the SDK. */
  caller: "junction" | "folio";
};
