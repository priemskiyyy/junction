import { expect, test } from "vitest";
import { z } from "zod";

import { intent } from "src/utils/intent";
import { JunctionError } from "src/utils/JunctionError";

const OpenDocument = z
  .object({
    documentId: z.string().min(1),
    accountId: z.string().optional(),
    count: z.string().transform(Number).optional(),
  })
  .strict();

test("a definition validates through its schema and keeps the schema's output", () => {
  const openDocument = intent(OpenDocument);

  expect(openDocument.parse({ documentId: "document-42", count: "3" })).toEqual(
    {
      status: "valid",
      value: { documentId: "document-42", count: 3 },
    },
  );

  // @ts-expect-error External data can hold keys the schema does not declare.
  const refused = openDocument.parse({ documentId: "", extra: true });

  expect(refused.status).toBe("invalid");
  expect(
    refused.status === "invalid"
      ? refused.issues.map(({ path }) => path)
      : null,
  ).toEqual(["documentId", ""]);
});

test("a definition without options is public, version 1, waits ten minutes and takes three attempts", () => {
  const openDocument = intent(OpenDocument);

  expect(openDocument).toMatchObject({
    version: 1,
    expires: { in: 600_000 },
    attempts: 3,
    account: false,
  });
  expect(
    openDocument.target({ documentId: "document-42", accountId: "a" }),
  ).toBe(undefined);
  expect(Object.isFrozen(openDocument)).toBe(true);
  expect(Object.isFrozen(openDocument.expires)).toBe(true);
});

test("an account selector makes the definition account-bound and names the payload's target", () => {
  const targeted = intent(OpenDocument, {
    account: ({ accountId }) => accountId,
  });

  const current = intent(OpenDocument, { account: true });

  expect(targeted.account).toBe(true);
  expect(
    targeted.target({ documentId: "document-42", accountId: "account-3" }),
  ).toBe("account-3");
  expect(targeted.target({ documentId: "document-42" })).toBe(undefined);
  expect(current.account).toBe(true);
  expect(
    current.target({ documentId: "document-42", accountId: "account-3" }),
  ).toBe(undefined);
});

test("the options it is given are kept", () => {
  expect(
    intent(OpenDocument, { expires: { in: 60_000 }, attempts: 10, version: 4 }),
  ).toMatchObject({ version: 4, expires: { in: 60_000 }, attempts: 10 });
});

test.each([
  [{ attempts: 0 }, "attempts must be a whole number from 1 to 10."],
  [{ attempts: 11 }, "attempts must be a whole number from 1 to 10."],
  [
    { expires: { in: 0 } },
    "expires.in must be a whole number of milliseconds from 1 to 2147483647.",
  ],
  [
    { version: 0.5 },
    `version must be a whole number from 1 to ${Number.MAX_SAFE_INTEGER}.`,
  ],
])("an option out of range is misconfiguration: %o", (options, message) => {
  expect(() => intent(OpenDocument, options)).toThrow(
    new JunctionError({ code: "INVALID_CONFIGURATION", message }),
  );
});
