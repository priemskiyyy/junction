import { JunctionError } from "src/utils/JunctionError";

export const resolveCount = (
  option: string,
  value: number | undefined,
  { fallback, maximum }: { fallback: number; maximum: number },
) => {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new JunctionError({
      code: "INVALID_CONFIGURATION",
      message: `${option} must be a whole number from 1 to ${maximum}.`,
    });
  }

  return value;
};
