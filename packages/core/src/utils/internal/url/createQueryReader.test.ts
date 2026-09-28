import { expect, test } from "vitest";

import { createQueryReader } from "src/utils/internal/url/createQueryReader";
import { JunctionError } from "src/utils/JunctionError";

test("a reader answers one value, every value in order, and presence", () => {
  const query = createQueryReader([
    ["account", "a-3"],
    ["tag", "urgent"],
    ["tag", "shared"],
    ["empty", ""],
  ]);

  expect(query.single("account")).toBe("a-3");
  expect(query.single("empty")).toBe("");
  expect(query.single("missing")).toBe(undefined);
  expect(query.all("tag")).toEqual(["urgent", "shared"]);
  expect(query.all("missing")).toEqual([]);
  expect(query.has("empty")).toBe(true);
  expect(query.has("missing")).toBe(false);
});

test("a repeated key read as single is ambiguous, never first-wins or last-wins", () => {
  const query = createQueryReader([
    ["account", "a-3"],
    ["account", "a-4"],
  ]);

  expect(() => query.single("account")).toThrow(
    new JunctionError({
      code: "AMBIGUOUS_QUERY",
      message: 'The query repeats "account", which is read as a single value.',
    }),
  );
});
