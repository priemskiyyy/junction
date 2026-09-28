import { expect, test } from "vitest";

import { resolveDuration } from "src/utils/internal/options/resolveDuration";
import { JunctionError } from "src/utils/JunctionError";

test("an absent duration takes the fallback and a valid one is kept", () => {
  expect(resolveDuration("expires.in", undefined, { fallback: 600_000 })).toBe(
    600_000,
  );
  expect(resolveDuration("expires.in", 1, { fallback: 600_000 })).toBe(1);
  expect(
    resolveDuration("expires.in", 2_147_483_647, { fallback: 600_000 }),
  ).toBe(2_147_483_647);
  expect(resolveDuration("after", 0, { fallback: 0, minimum: 0 })).toBe(0);
});

test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
  "a duration of %s is refused as misconfiguration, naming the option",
  (value) => {
    expect(() =>
      resolveDuration("expires.in", value, { fallback: 600_000 }),
    ).toThrow(
      new JunctionError({
        code: "INVALID_CONFIGURATION",
        message:
          "expires.in must be a whole number of milliseconds from 1 to 2147483647.",
      }),
    );
  },
);
