import { expect, test } from "vitest";

import { JunctionError } from "src/utils/JunctionError";

test("an error carries its code, its message and the cause it was given", () => {
  const cause = new Error("the handler threw");

  const error = new JunctionError({
    code: "HANDLER_FAILED",
    message: "The handler failed.",
    cause,
  });

  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("JunctionError");
  expect(error.code).toBe("HANDLER_FAILED");
  expect(error.message).toBe("The handler failed.");
  expect(error.cause).toBe(cause);
});

test("an error without a cause has no cause of its own", () => {
  const error = new JunctionError({
    code: "INVALID_CONFIGURATION",
    message: "The options are invalid.",
  });

  expect(Object.hasOwn(error, "cause")).toBe(false);
});
