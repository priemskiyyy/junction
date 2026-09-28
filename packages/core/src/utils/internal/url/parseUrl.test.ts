import { expect, test } from "vitest";

import { parseUrl } from "src/utils/internal/url/parseUrl";

const getUrl = (raw: string) => {
  const parsed = parseUrl(raw);

  if (parsed.kind === "REFUSED") {
    throw new Error(`Expected ${raw} to parse: ${parsed.message}`);
  }

  return parsed.url;
};

const getRefusal = (raw: string) => {
  const parsed = parseUrl(raw);

  if (parsed.kind === "PARSED") {
    throw new Error(`Expected ${raw} to be refused.`);
  }

  return parsed.message;
};

test("an https URL is split into its lowercased scheme and host, its decoded segments and its query", () => {
  expect(
    getUrl(
      "HTTPS://App.Example.COM/workspaces/w%207/documents/doc-42?account=a-3#comment-9",
    ),
  ).toEqual({
    scheme: "https",
    host: "app.example.com",
    port: null,
    segments: ["workspaces", "w 7", "documents", "doc-42"],
    query: [["account", "a-3"]],
  });
});

test("an explicit default port equals no port, and any other port is kept", () => {
  expect(getUrl("https://app.example.com:443/a").port).toBe(null);
  expect(getUrl("http://app.example.com:80/a").port).toBe(null);
  expect(getUrl("https://app.example.com:8443/a").port).toBe(8443);
  expect(getUrl("http://app.example.com:443/a").port).toBe(443);
});

test("a custom scheme keeps the host it arrives with, so myapp://conversation and myapp:///conversation differ", () => {
  expect(getUrl("myapp://conversation/42")).toMatchObject({
    scheme: "myapp",
    host: "conversation",
    segments: ["42"],
  });
  expect(getUrl("myapp:///conversation/42")).toMatchObject({
    scheme: "myapp",
    host: "",
    segments: ["conversation", "42"],
  });
});

test("the root is the same path with or without its slash, and any other trailing slash is a different path", () => {
  expect(getUrl("https://app.example.com").segments).toEqual([]);
  expect(getUrl("https://app.example.com/").segments).toEqual([]);
  expect(getUrl("https://app.example.com/?a=1").segments).toEqual([]);
  expect(getUrl("https://app.example.com/documents/").segments).toEqual([
    "documents",
    "",
  ]);
});

test("the query keeps repeated keys in order, reads + as a space and a bare key as empty", () => {
  expect(
    getUrl("https://a.com/?tag=a&tag=b&empty=&flag&q=x+y&e=%20&&").query,
  ).toEqual([
    ["tag", "a"],
    ["tag", "b"],
    ["empty", ""],
    ["flag", ""],
    ["q", "x y"],
    ["e", " "],
  ]);
  expect(getUrl("https://a.com/a+b").segments).toEqual(["a+b"]);
});

test("a segment is decoded once, so %252F stays the text %2F and never becomes a separator", () => {
  expect(getUrl("https://a.com/documents/%252F..%252F").segments).toEqual([
    "documents",
    "%2F..%2F",
  ]);
});

test.each([
  [
    "https://user@app.example.com/a",
    "The URL carries credentials before its host.",
  ],
  [
    "https://user:secret@app.example.com/a",
    "The URL carries credentials before its host.",
  ],
  [
    "https://app.example.com@evil.com/a",
    "The URL carries credentials before its host.",
  ],
  [
    "https://app.example.com%2eevil.com/a",
    "The URL's host holds characters a host cannot.",
  ],
  ["https://[::1]/a", "The URL's host holds characters a host cannot."],
  [
    "https://app*example.com/a",
    "The URL's host holds characters a host cannot.",
  ],
  [
    "https://lin\u212a.example.com/a",
    "The URL's host holds characters a host cannot.",
  ],
  ["https://app.example.com:0/a", "The URL's port is not a port number."],
  ["https://app.example.com:65536/a", "The URL's port is not a port number."],
  ["https://app.example.com:/a", "The URL's port is not a port number."],
  ["https://app.example.com:8a/a", "The URL's port is not a port number."],
])("a confusable authority is refused: %s", (raw, message) => {
  expect(getRefusal(raw)).toBe(message);
});

test.each([
  ["https://app.example.com\\@evil.com/a"],
  ["https://app.example.com/a b"],
  ["https://app.example.com/a\nb"],
  ["https://app.example.com/a\u0000"],
  ["https://app.example.com/a\u0085"],
  ["https://app.example.com/a\u007f"],
])(
  "a backslash, a space or a control character is refused before parsing: %j",
  (raw) => {
    expect(getRefusal(raw)).toBe(
      "The URL holds a space, a control character or a backslash.",
    );
  },
);

test.each([
  ["//app.example.com/a"],
  ["myapp:conversation/42"],
  ["/documents/42"],
  ["1app://open"],
  [""],
])("a URL without a scheme followed by // is refused: %j", (raw) => {
  expect(getRefusal(raw)).toBe("The URL has no scheme followed by //.");
});

test.each([
  ["https://a.com/%zz", "The URL's path holds an invalid percent-encoding."],
  ["https://a.com/%e0%a4", "The URL's path holds an invalid percent-encoding."],
  ["https://a.com/%c0%af", "The URL's path holds an invalid percent-encoding."],
  [
    "https://a.com/%ed%a0%80",
    "The URL's path holds an invalid percent-encoding.",
  ],
  [
    "https://a.com/?q=%zz",
    "The URL's query holds an invalid percent-encoding.",
  ],
  [
    "https://a.com/?%e0%a4=1",
    "The URL's query holds an invalid percent-encoding.",
  ],
])(
  "malformed percent-encoding and malformed UTF-8 fail closed: %s",
  (raw, message) => {
    expect(getRefusal(raw)).toBe(message);
  },
);

test.each([
  ["https://a.com/workspaces/../admin"],
  ["https://a.com/workspaces/./a"],
  ["https://a.com/workspaces/%2e%2e/admin"],
  ["https://a.com/workspaces/.%2E/admin"],
  ["https://a.com/workspaces/%2e/a"],
])(
  "a dot segment, raw or encoded, is refused before it can move the path: %s",
  (raw) => {
    expect(getRefusal(raw)).toBe("The URL's path holds a dot segment.");
  },
);

test.each([
  ["https://a.com/documents/a%2Fb"],
  ["https://a.com/documents/a%2fb"],
  ["https://a.com/documents/a%5Cb"],
  ["https://a.com/documents/a%00b"],
  ["https://a.com/documents/a%0Ab"],
])(
  "an encoded separator or control character in a segment is refused: %s",
  (raw) => {
    expect(getRefusal(raw)).toBe(
      "The URL's path encodes a separator or a control character.",
    );
  },
);

test("a URL longer than 8 KiB is refused before it is parsed, and one at the limit is not", () => {
  const prefix = "https://a.com/";

  expect(parseUrl(`${prefix}${"a".repeat(8_192 - prefix.length)}`).kind).toBe(
    "PARSED",
  );
  expect(getRefusal(`${prefix}${"a".repeat(8_193 - prefix.length)}`)).toBe(
    "The URL is longer than 8192 characters.",
  );
});
