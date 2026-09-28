import type { ValidationResult } from "src/types/ValidationResult";

export const getRefusal = (
  message: string,
  path = "",
): ValidationResult<never> => ({
  status: "invalid",
  issues: [{ path, message }],
});
