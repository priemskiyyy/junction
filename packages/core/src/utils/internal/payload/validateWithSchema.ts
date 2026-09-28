import type { StandardSchema } from "src/types/StandardSchema";
import type { ValidationResult } from "src/types/ValidationResult";
import { getRefusal } from "src/utils/internal/payload/getRefusal";

export const validateWithSchema = <TOutput>(
  schema: StandardSchema<unknown, TOutput>,
  input: unknown,
): ValidationResult<TOutput> => {
  try {
    const result = schema["~standard"].validate(input);

    if ("then" in result) {
      // The contract allows a promise; admission cannot wait for one, so it is observed and refused.
      result.then(
        () => {},
        () => {},
      );

      return getRefusal(
        "The schema validated asynchronously; intent schemas must validate synchronously.",
      );
    }

    if (result.issues !== undefined) {
      return {
        status: "invalid",
        issues: Array.from(result.issues, ({ message, path = [] }) => ({
          path: Array.from(path, (segment) =>
            String(typeof segment === "object" ? segment.key : segment),
          ).join("."),
          message,
        })),
      };
    }

    return { status: "valid", value: result.value };
  } catch {
    return getRefusal("The schema threw while validating.");
  }
};
