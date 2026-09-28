import type { JunctionErrorCode } from "src/types/JunctionErrorCode";
import { JunctionError } from "src/utils/JunctionError";

// A cause is what a provider or a storage handed over, which may hold a link, a token or stored text.
export const getCauselessError = <TCode extends JunctionErrorCode>(
  error: JunctionError<TCode>,
) =>
  Object.freeze(
    new JunctionError({ code: error.code, message: error.message }),
  );
