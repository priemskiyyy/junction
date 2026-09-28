import { expect, test } from "vitest";

import { getSettlement } from "src/utils/internal/execution/getSettlement";
import { JunctionError } from "src/utils/JunctionError";

type Outcome =
  { kind: "RETURNED"; value: unknown } | { kind: "THREW"; error: unknown };

const returned = (value: unknown): Outcome => ({ kind: "RETURNED", value });
const threw = (error: unknown): Outcome => ({ kind: "THREW", error });

test("a current attempt that returns nothing or handled is acknowledged", () => {
  expect(
    getSettlement({
      latch: null,
      invalidation: null,
      outcome: returned(undefined),
    }),
  ).toEqual({ kind: "ACKNOWLEDGED", ignored: null });
  expect(
    getSettlement({
      latch: null,
      invalidation: null,
      outcome: returned({ status: "handled" }),
    }),
  ).toEqual({ kind: "ACKNOWLEDGED", ignored: null });
});

test("a rejection and a retry take their own transitions", () => {
  expect(
    getSettlement({
      latch: null,
      invalidation: null,
      outcome: returned({ status: "rejected", reason: "not-authorized" }),
    }),
  ).toEqual({ kind: "REJECTED", reason: "not-authorized" });
  expect(
    getSettlement({
      latch: null,
      invalidation: null,
      outcome: returned({ status: "retry", after: 0 }),
    }),
  ).toEqual({ kind: "RETRY", after: 0 });
});

test("a throw fails the attempt with the thrown value as its cause, and never retries by itself", () => {
  const failure = new Error("the API is down");

  const settlement = getSettlement({
    latch: null,
    invalidation: null,
    outcome: threw(failure),
  });

  expect(settlement).toEqual({
    kind: "FAILED",
    error: new JunctionError({
      code: "HANDLER_FAILED",
      message: "The handler threw.",
    }),
  });
  expect(settlement.kind === "FAILED" ? settlement.error.cause : null).toBe(
    failure,
  );
});

test.each([
  [{ status: 200, ok: true }],
  ["done"],
  [{ status: "rejected", reason: "" }],
  [{ status: "rejected", reason: "x".repeat(161) }],
  [{ status: "retry", after: -1 }],
  [{ status: "retry", after: 1.5 }],
  [{ status: "retry", after: 2_147_483_648 }],
])(
  "an answer that is not nothing or a valid outcome fails the attempt: %o",
  (value) => {
    expect(
      getSettlement({
        latch: null,
        invalidation: null,
        outcome: returned(value),
      }),
    ).toEqual({
      kind: "FAILED",
      error: new JunctionError({
        code: "INVALID_HANDLER_RESULT",
        message:
          "The handler answered something other than nothing or an outcome of its execution.",
      }),
    });
  },
);

test("a committed effect wins over everything the handler or an invalidation does afterwards", () => {
  expect(
    getSettlement({
      latch: "HANDLED",
      invalidation: { kind: "INTERRUPTED", code: "OWNER_DISPOSED" },
      outcome: threw(new Error("after the commit")),
    }),
  ).toEqual({ kind: "ACKNOWLEDGED", ignored: "threw" });
  expect(
    getSettlement({
      latch: "HANDLED",
      invalidation: { kind: "EXPIRED" },
      outcome: returned({ status: "rejected", reason: "late" }),
    }),
  ).toEqual({ kind: "ACKNOWLEDGED", ignored: "answered" });
});

test("an effect that threw after entering is uncertain, never replayed as a failure", () => {
  expect(
    getSettlement({
      latch: "UNCERTAIN",
      invalidation: null,
      outcome: threw(new Error("the navigator threw")),
    }),
  ).toEqual({
    kind: "INTERRUPTED",
    error: new JunctionError({
      code: "EFFECT_UNCERTAIN",
      message:
        "The committed effect threw, so it may or may not have taken effect.",
    }),
  });
});

test("an invalidated attempt is interrupted with its reason whatever the handler answers", () => {
  expect(
    getSettlement({
      latch: null,
      invalidation: { kind: "INTERRUPTED", code: "IDENTITY_CHANGED" },
      outcome: returned(undefined),
    }),
  ).toEqual({
    kind: "INTERRUPTED",
    error: new JunctionError({
      code: "IDENTITY_CHANGED",
      message: "The identity changed while the attempt ran.",
    }),
  });
});

test("expiry and cancellation during an attempt end it as such", () => {
  expect(
    getSettlement({
      latch: null,
      invalidation: { kind: "EXPIRED" },
      outcome: returned(undefined),
    }),
  ).toEqual({ kind: "EXPIRED" });
  expect(
    getSettlement({
      latch: "UNCERTAIN",
      invalidation: { kind: "CANCELLED" },
      outcome: returned(undefined),
    }),
  ).toEqual({ kind: "CANCELLED" });
});
