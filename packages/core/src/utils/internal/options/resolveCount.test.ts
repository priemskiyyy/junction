import { expect, test } from "vitest";

import { resolveCount } from "src/utils/internal/options/resolveCount";
import { JunctionError } from "src/utils/JunctionError";

test("an absent count takes the fallback and a valid one is kept", () => {
  expect(
    resolveCount("attempts", undefined, { fallback: 3, maximum: 10 }),
  ).toBe(3);
  expect(resolveCount("attempts", 1, { fallback: 3, maximum: 10 })).toBe(1);
  expect(resolveCount("attempts", 10, { fallback: 3, maximum: 10 })).toBe(10);
});

test.each([0, 11, 2.5, Number.NaN])(
  "a count of %s is refused as misconfiguration, naming the option",
  (value) => {
    expect(() =>
      resolveCount("attempts", value, { fallback: 3, maximum: 10 }),
    ).toThrow(
      new JunctionError({
        code: "INVALID_CONFIGURATION",
        message: "attempts must be a whole number from 1 to 10.",
      }),
    );
  },
);
