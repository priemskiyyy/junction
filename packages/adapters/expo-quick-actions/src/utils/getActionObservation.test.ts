import { expect, test } from "vitest";

import type { QuickActionLike } from "src/types/QuickActionLike";
import { getActionObservation } from "src/utils/getActionObservation";

const WITHOUT_PARAMS: QuickActionLike[] = [
  { id: "search" },
  { id: "search", params: null },
];

test("an action becomes the observation of its id and params", () => {
  expect(
    getActionObservation({ id: "new-document", params: { template: "blank" } }),
  ).toEqual({
    input: { action: { id: "new-document", params: { template: "blank" } } },
  });
});

test.each(WITHOUT_PARAMS)(
  "an action without params, as in %o, is observed with none",
  (action) => {
    expect(getActionObservation(action)).toEqual({
      input: { action: { id: "search", params: {} } },
    });
  },
);
