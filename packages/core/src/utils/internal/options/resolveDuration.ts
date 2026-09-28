import { MAX_DURATION } from "src/utils/constants/defaults";
import { JunctionError } from "src/utils/JunctionError";

export const resolveDuration = (
  option: string,
  value: number | undefined,
  { fallback, minimum = 1 }: { fallback: number; minimum?: number },
) => {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < minimum || value > MAX_DURATION) {
    throw new JunctionError({
      code: "INVALID_CONFIGURATION",
      message: `${option} must be a whole number of milliseconds from ${minimum} to ${MAX_DURATION}.`,
    });
  }

  return value;
};
