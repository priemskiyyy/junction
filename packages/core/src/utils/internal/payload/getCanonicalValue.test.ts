import { expect, test } from "vitest";

import { getCanonicalValue } from "src/utils/internal/payload/getCanonicalValue";

const getCopy = (value: unknown, limit = 16_384) => {
  const result = getCanonicalValue(value, limit);

  if (result.status === "invalid") {
    throw new Error("Expected the value to be kept.");
  }

  return result;
};

const getRefusal = (value: unknown, limit = 16_384) => {
  const result = getCanonicalValue(value, limit);

  if (result.status === "valid") {
    throw new Error("Expected the value to be refused.");
  }

  return result.issues;
};

test("plain JSON is copied, frozen all the way down, and keeps no alias to the original", () => {
  const original = {
    workspace: { id: "workspace-7" },
    documents: ["document-42"],
  };

  const { value } = getCopy(original);

  expect(value).toEqual(original);
  expect(value).not.toBe(original);
  expect(Object.isFrozen(value)).toBe(true);
  expect(Object.isFrozen(Reflect.get(Object(value), "workspace"))).toBe(true);
  expect(Object.isFrozen(Reflect.get(Object(value), "documents"))).toBe(true);

  original.workspace.id = "workspace-8";
  original.documents.push("document-43");

  expect(value).toEqual({
    workspace: { id: "workspace-7" },
    documents: ["document-42"],
  });
});

test("the canonical text sorts keys, so equal payloads compare equal whatever their key order", () => {
  const first = getCopy({ b: 1, a: { d: true, c: null } });
  const second = getCopy({ a: { c: null, d: true }, b: 1 });

  expect(first.text).toBe('{"a":{"c":null,"d":true},"b":1}');
  expect(second.text).toBe('{"a":{"c":null,"d":true},"b":1}');
});

test("a property whose value is undefined is left out, so an optional field is an absent key", () => {
  const { value, text } = getCopy({ documentId: "a", accountId: undefined });

  expect(Reflect.ownKeys(Object(value))).toEqual(["documentId"]);
  expect(text).toBe('{"documentId":"a"}');
});

test("undefined at the top or in an array, a hole, a function, a bigint, a class instance and a Date are refused", () => {
  const holed: string[] = [];

  holed[0] = "a";
  holed[2] = "c";

  class Link {
    url = "https://app.example.com";
  }

  expect(getRefusal(undefined)).toEqual([
    { path: "", message: "Only JSON values can be kept." },
  ]);
  expect(getRefusal({ ids: ["a", undefined] })).toEqual([
    { path: "ids.1", message: "Only JSON values can be kept." },
  ]);
  expect(getRefusal({ ids: holed })).toEqual([
    { path: "ids.1", message: "Only JSON values can be kept." },
  ]);
  expect(getRefusal({ open: () => {} })).toEqual([
    { path: "open", message: "Only JSON values can be kept." },
  ]);
  expect(getRefusal({ count: 7n })).toEqual([
    { path: "count", message: "Only JSON values can be kept." },
  ]);
  expect(getRefusal({ link: new Link() })).toEqual([
    { path: "link", message: "Only JSON values can be kept." },
  ]);
  expect(getRefusal({ at: new Date(0) })).toEqual([
    { path: "at", message: "Only JSON values can be kept." },
  ]);
});

test("a non-finite number is refused and negative zero becomes zero", () => {
  expect(getRefusal({ count: Number.NaN })).toEqual([
    { path: "count", message: "Only JSON values can be kept." },
  ]);
  expect(getRefusal({ count: Number.POSITIVE_INFINITY })).toEqual([
    { path: "count", message: "Only JSON values can be kept." },
  ]);

  const { value, text } = getCopy({ count: -0 });

  expect(Object.is(Reflect.get(Object(value), "count"), 0)).toBe(true);
  expect(text).toBe('{"count":0}');
});

test("a value nesting deeper than the limit is refused, one at the limit is kept, and so is the same object twice", () => {
  const nest = (depth: number): unknown => {
    if (depth === 0) {
      return {};
    }

    return { next: nest(depth - 1) };
  };

  const shared = { id: "a" };

  expect(getCopy(nest(15)).status).toBe("valid");
  expect(getRefusal(nest(16))).toEqual([
    {
      path: Array.from({ length: 16 }, () => "next").join("."),
      message: "The value nests deeper than 16.",
    },
  ]);
  expect(getCopy({ first: shared, second: shared }).value).toEqual({
    first: { id: "a" },
    second: { id: "a" },
  });
});

test("a cycle is refused by the depth bound", () => {
  const cycle: { self?: unknown } = {};

  cycle.self = cycle;

  expect(getRefusal(cycle)).toEqual([
    {
      path: Array.from({ length: 16 }, () => "self").join("."),
      message: "The value nests deeper than 16.",
    },
  ]);
});

test("a value larger than the limit in UTF-8 bytes is refused, and one exactly at it is kept", () => {
  expect(getCopy({ a: { b: "12345" } }, 19)).toMatchObject({
    text: '{"a":{"b":"12345"}}',
    size: 19,
  });
  expect(getRefusal({ a: { b: "123456" } }, 19)).toEqual([
    { path: "a.b", message: "The value is larger than 19 bytes." },
  ]);
  expect(getRefusal({ a: { b: "文文文" } }, 19)).toEqual([
    { path: "", message: "The value is larger than 19 bytes." },
  ]);
});

test("a huge string is refused, and a huge array stops at the first item past the limit", () => {
  expect(getRefusal({ a: "x".repeat(1_000_000) }, 100)).toEqual([
    { path: "a", message: "The value is larger than 100 bytes." },
  ]);
  expect(
    getRefusal({ ids: Array.from({ length: 100_000 }, () => 1) }, 100),
  ).toEqual([
    { path: "ids.45", message: "The value is larger than 100 bytes." },
  ]);
});

test("a key named __proto__ stays an own data key and changes no prototype", () => {
  const parsed: unknown = JSON.parse(
    '{"__proto__":{"polluted":true},"id":"a"}',
  );

  const copied = Object(getCopy(parsed).value);

  expect(Object.hasOwn(copied, "__proto__")).toBe(true);
  expect(Reflect.getPrototypeOf(copied)).toBe(Object.prototype);
  expect("polluted" in {}).toBe(false);
});

test("a getter or a proxy trap that throws refuses the value instead of throwing", () => {
  const trapped = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error("ownKeys trap");
      },
    },
  );

  const getter = Object.defineProperty({}, "documentId", {
    enumerable: true,
    get: () => {
      throw new Error("getter");
    },
  });

  expect(getRefusal(trapped)).toEqual([
    { path: "", message: "The value could not be read." },
  ]);
  expect(getRefusal(getter)).toEqual([
    { path: "", message: "The value could not be read." },
  ]);
});
