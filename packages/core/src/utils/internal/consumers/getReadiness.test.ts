import { expect, test } from "vitest";

import { createRegistration } from "src/utils/internal/consumers/createRegistration.fixture";
import { getReadiness } from "src/utils/internal/consumers/getReadiness";

test("readiness reads a boolean or calls a getter, and a getter that throws is a failure", () => {
  expect(getReadiness(createRegistration("a", { ready: true }))).toBe("READY");
  expect(getReadiness(createRegistration("b", { ready: false }))).toBe(
    "NOT_READY",
  );
  expect(getReadiness(createRegistration("c", { ready: () => true }))).toBe(
    "READY",
  );
  expect(getReadiness(createRegistration("d", { ready: () => false }))).toBe(
    "NOT_READY",
  );
  expect(
    getReadiness(
      createRegistration("e", {
        ready: () => {
          throw new Error("the getter broke");
        },
      }),
    ),
  ).toBe("FAILED");
});
