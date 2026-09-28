import type { HandOff } from "example-shared/device/types/HandOff";
import type { SdkCall } from "example-shared/device/types/SdkCall";
import type { SdkName } from "example-shared/device/types/SdkName";
import { createEventLog } from "example-shared/utils/createEventLog";

const LOG_LENGTH = 40;

/** What the device saw: every call Folio's code made into an SDK, and every entry point an SDK handed to Junction. */
export const createDeviceLog = ({
  getNextId,
  now,
}: {
  getNextId: () => number;
  now: () => number;
}) => {
  const calls = createEventLog<SdkCall>(LOG_LENGTH);
  const handOffs = createEventLog<HandOff>(LOG_LENGTH);

  return {
    calls: calls.log,
    handOffs: handOffs.log,
    call: (
      sdk: SdkName,
      call: string,
      answer: string | null = null,
      caller: SdkCall["caller"] = "junction",
    ) => {
      calls.add({
        id: getNextId(),
        timestamp: now(),
        sdk,
        call,
        answer,
        caller,
      });
    },
    handOff: (handOff: Omit<HandOff, "id" | "timestamp">) => {
      handOffs.add({ ...handOff, id: getNextId(), timestamp: now() });
    },
  };
};
