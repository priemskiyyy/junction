import type { SdkCall } from "example-shared/device/types/SdkCall";
import type { Tone } from "example-shared/types/Tone";

/** How the device log names who called an SDK. */
export const CALLERS: Record<SdkCall["caller"], { label: string; tone: Tone }> =
  {
    junction: { label: "Junction adapter", tone: "accent" },
    folio: { label: "Folio's code", tone: "neutral" },
  };
