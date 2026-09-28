import { expect, test } from "vitest";

import { getDetourObservation } from "src/utils/getDetourObservation";

test("a deferred link loses Detour's parameters and is claimed deferred", () => {
  expect(
    getDetourObservation(
      "detour://documents/42?fromDeepLink=true&linkType=deferred",
    ),
  ).toEqual({ input: { url: "detour://documents/42" }, deferred: true });
});

test.each(["verified", "scheme"])(
  "a %s link keeps its own query and is claimed not deferred",
  (linkType) => {
    expect(
      getDetourObservation(
        `detour://documents/42?ref=mail&fromDeepLink=true&linkType=${linkType}`,
      ),
    ).toEqual({
      input: { url: "detour://documents/42?ref=mail" },
      deferred: false,
    });
  },
);

test("only the pair Detour appends last goes, so a link's own parameters of those names stay", () => {
  expect(
    getDetourObservation(
      "detour://documents/42?linkType=pdf&fromDeepLink=true&linkType=verified&fromDeepLink=true&linkType=deferred",
    ),
  ).toEqual({
    input: {
      url: "detour://documents/42?linkType=pdf&fromDeepLink=true&linkType=verified",
    },
    deferred: true,
  });
});

test("a URL without Detour's parameters is pushed whole, with no claim about deferral", () => {
  expect(getDetourObservation("detour://documents/42?ref=mail")).toEqual({
    input: { url: "detour://documents/42?ref=mail" },
  });
});
