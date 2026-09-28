import { expect, test } from "vitest";

import { assertUnreachable } from "src/utils/common/assertUnreachable";

type Delivery = "initial" | "live";

type Outcome =
  { status: "acknowledged" } | { status: "rejected"; reason: string };

const describeDelivery = (delivery: Delivery) => {
  if (delivery === "initial") {
    return "the launch link";
  }

  if (delivery === "live") {
    return "a link while running";
  }

  return assertUnreachable(delivery);
};

const describeOutcome = (outcome: Outcome) => {
  if (outcome.status === "acknowledged") {
    return "handled";
  }

  if (outcome.status === "rejected") {
    return `rejected as ${outcome.reason}`;
  }

  return assertUnreachable(outcome);
};

test("every declared variant is handled before the unreachable branch", () => {
  expect(describeDelivery("initial")).toBe("the launch link");
  expect(describeDelivery("live")).toBe("a link while running");
  expect(describeOutcome({ status: "acknowledged" })).toBe("handled");
  expect(
    describeOutcome({ status: "rejected", reason: "not-authorized" }),
  ).toBe("rejected as not-authorized");
});

test("a value that slipped past the types fails loudly and is named", () => {
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => describeDelivery("replay")).toThrow(
    new Error('Unexpected value: "replay"'),
  );
});

test("an object variant is printed, never as [object Object]", () => {
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => describeOutcome({ status: "retry", after: 0 })).toThrow(
    new Error('Unexpected value: {"status":"retry","after":0}'),
  );
});

test("a variant JSON cannot print still throws a readable error", () => {
  const circular: { status: "pending"; self?: unknown } = {
    status: "pending",
  };

  circular.self = circular;

  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => describeOutcome(circular)).toThrow(
    new Error("Unexpected value: [object Object]"),
  );
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => describeDelivery(undefined)).toThrow(
    new Error("Unexpected value: undefined"),
  );
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => describeDelivery(7n)).toThrow(new Error("Unexpected value: 7"));
});
