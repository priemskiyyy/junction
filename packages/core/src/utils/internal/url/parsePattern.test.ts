import { expect, test } from "vitest";

import { parsePattern } from "src/utils/internal/url/parsePattern";
import { JunctionError } from "src/utils/JunctionError";

test("a pattern compiles into its origin, its literal segments and its parameters", () => {
  expect(
    parsePattern(
      "documentUrl",
      "https://App.Example.com/workspaces/:workspaceId/documents/:documentId",
    ),
  ).toEqual({
    origin: "https://app.example.com",
    scheme: "https",
    host: "app.example.com",
    port: null,
    segments: [
      { kind: "LITERAL", value: "workspaces" },
      { kind: "PARAMETER", name: "workspaceId" },
      { kind: "LITERAL", value: "documents" },
      { kind: "PARAMETER", name: "documentId" },
    ],
  });
});

test("the origin names the port only when it is not the scheme's default", () => {
  expect(parsePattern("a", "https://app.example.com:443/a").origin).toBe(
    "https://app.example.com",
  );
  expect(parsePattern("a", "https://app.example.com:8443/a").origin).toBe(
    "https://app.example.com:8443",
  );
  expect(parsePattern("a", "myapp:///conversation/:id").origin).toBe(
    "myapp://",
  );
});

test.each([
  [
    "https://app.example.com/search?q=:q",
    "routes.search: a URL pattern has no query or fragment.",
  ],
  [
    "https://app.example.com/a#:section",
    "routes.search: a URL pattern has no query or fragment.",
  ],
  [
    "https://app.example.com/a//b",
    "routes.search: a URL pattern has no empty path segment.",
  ],
  [
    "https://app.example.com/documents/doc-:id",
    'routes.search: "doc-:id" is not a parameter: a parameter is a whole segment such as ":documentId".',
  ],
  [
    "https://app.example.com/documents/:1d",
    'routes.search: ":1d" is not a parameter: a parameter is a whole segment such as ":documentId".',
  ],
  [
    "https://app.example.com/:id/:id",
    'routes.search: the parameter ":id" repeats.',
  ],
  ["/documents/:id", "routes.search: The URL has no scheme followed by //."],
  [
    "https://user@app.example.com/:id",
    "routes.search: The URL carries credentials before its host.",
  ],
])(
  "a pattern the grammar refuses is misconfiguration: %s",
  (pattern, message) => {
    expect(() => parsePattern("search", pattern)).toThrow(
      new JunctionError({ code: "INVALID_CONFIGURATION", message }),
    );
  },
);
