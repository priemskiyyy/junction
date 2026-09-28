import { expect, test, vi } from "vitest";
import { z } from "zod";

import type { StandardSchema } from "src/types/StandardSchema";
import { validateWithSchema } from "src/utils/internal/payload/validateWithSchema";

const createSchema = (
  validate: StandardSchema["~standard"]["validate"],
): StandardSchema => ({
  "~standard": { version: 1, vendor: "test", validate },
});

test("a valid value comes back as the schema's output, transformed once", () => {
  const schema = z.object({ count: z.string().transform(Number) });

  expect(validateWithSchema(schema, { count: "3" })).toEqual({
    status: "valid",
    value: { count: 3 },
  });
});

test("issues come back with dotted paths, whatever the path segments are", () => {
  const schema = createSchema(() => ({
    issues: [
      { message: "Expected a string.", path: ["workspace", { key: "id" }] },
      { message: "Required.", path: ["documents", 0] },
      { message: "Expected an object." },
    ],
  }));

  expect(validateWithSchema(schema, {})).toEqual({
    status: "invalid",
    issues: [
      { path: "workspace.id", message: "Expected a string." },
      { path: "documents.0", message: "Required." },
      { path: "", message: "Expected an object." },
    ],
  });
});

test("an asynchronous schema is refused and its rejection is observed", async () => {
  const unhandled = vi.fn();

  process.on("unhandledRejection", unhandled);

  const schema = createSchema(() => Promise.reject(new Error("remote check")));

  expect(validateWithSchema(schema, {})).toEqual({
    status: "invalid",
    issues: [
      {
        path: "",
        message:
          "The schema validated asynchronously; intent schemas must validate synchronously.",
      },
    ],
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  process.off("unhandledRejection", unhandled);
  expect(unhandled.mock.calls).toEqual([]);
});

test("a schema that throws refuses the value", () => {
  const throwing = createSchema(() => {
    throw new Error("the schema broke");
  });

  expect(validateWithSchema(throwing, {})).toEqual({
    status: "invalid",
    issues: [{ path: "", message: "The schema threw while validating." }],
  });
});
