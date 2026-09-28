import { expect, test } from "vitest";

import { getPressObservation } from "src/utils/getPressObservation";

const response = (identifier: string) => ({
  notification: {
    request: {
      identifier,
      content: { data: { documentId: "42" }, categoryIdentifier: null },
    },
  },
  actionIdentifier: "reply",
  userText: "On my way",
});

test("a press keeps the notification, the action with its text, and the data", () => {
  expect(getPressObservation(response("n-1"), false)).toEqual({
    input: {
      notification: { id: "n-1", category: null },
      action: { id: "reply", text: "On my way" },
      data: { documentId: "42" },
    },
  });
});

test("per action, the notification and the action together are the occurrence, kept for the installation", () => {
  expect(getPressObservation(response("n-1"), true)).toMatchObject({
    interaction: { key: '["n-1","reply"]', scope: "installation" },
  });
});

test("identifiers too long for an interaction key are delivered without one", () => {
  expect(
    getPressObservation(response("n".repeat(200)), true),
  ).not.toHaveProperty("interaction");
});
