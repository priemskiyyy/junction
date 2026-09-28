import { expect, test } from "vitest";

import { matchPattern } from "src/utils/internal/url/matchPattern";
import { parsePattern } from "src/utils/internal/url/parsePattern";
import { parseUrl } from "src/utils/internal/url/parseUrl";

const DOCUMENT = parsePattern(
  "documentUrl",
  "https://app.example.com/workspaces/:workspaceId/documents/:documentId",
);

const match = (raw: string, pattern = DOCUMENT) => {
  const parsed = parseUrl(raw);

  if (parsed.kind === "REFUSED") {
    return parsed.message;
  }

  return matchPattern(pattern, parsed.url);
};

test("a matching URL captures each parameter, decoded once", () => {
  expect(
    match("https://app.example.com/workspaces/w-7/documents/doc%2042?x=1"),
  ).toEqual({
    workspaceId: "w-7",
    documentId: "doc 42",
  });
  expect(match("HTTPS://APP.EXAMPLE.COM:443/workspaces/w/documents/d")).toEqual(
    {
      workspaceId: "w",
      documentId: "d",
    },
  );
});

test.each([
  ["https://app.example.com.evil.com/workspaces/w/documents/d"],
  ["https://evil.com/app.example.com/workspaces/w/documents/d"],
  ["https://evilapp.example.com/workspaces/w/documents/d"],
  ["https://example.com/workspaces/w/documents/d"],
  ["http://app.example.com/workspaces/w/documents/d"],
  ["https://app.example.com:8443/workspaces/w/documents/d"],
  ["myapp://app.example.com/workspaces/w/documents/d"],
])(
  "another host, scheme or port never matches, however it is spelled: %s",
  (raw) => {
    expect(match(raw)).toBe(null);
  },
);

test.each([
  ["https://app.example.com/Workspaces/w/documents/d"],
  ["https://app.example.com/workspaces/w/documents/d/"],
  ["https://app.example.com/workspaces/w/documents"],
  ["https://app.example.com/workspaces/w/documents/d/comments"],
  ["https://app.example.com/workspaces//documents/d"],
])(
  "another path never matches: literals are case-sensitive and a parameter takes one nonempty segment: %s",
  (raw) => {
    expect(match(raw)).toBe(null);
  },
);

test("a parameter named __proto__ is captured as an own key", () => {
  const pattern = parsePattern("odd", "myapp://open/:__proto__");
  const params = match("myapp://open/value", pattern);

  expect(params).not.toBe(null);
  expect(Object.hasOwn(Object(params), "__proto__")).toBe(true);
  expect(Reflect.getPrototypeOf(Object(params))).toBe(Object.prototype);
});

test("a pattern that ends in a slash matches the URLs that end in one, and only those, since a trailing slash is a different path", () => {
  const invite = parsePattern(
    "inviteUrl",
    "https://www.example.com/invite/:code/",
  );

  expect(match("https://www.example.com/invite/abc/", invite)).toEqual({
    code: "abc",
  });
  expect(match("https://www.example.com/invite/abc", invite)).toBeNull();
  expect(match("https://www.example.com/invite/abc/", DOCUMENT)).toBeNull();
});
