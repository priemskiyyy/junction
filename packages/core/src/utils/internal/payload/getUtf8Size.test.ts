import { expect, test } from "vitest";

import { getUtf8Size } from "src/utils/internal/payload/getUtf8Size";

test("a size counts UTF-8 bytes, not UTF-16 code units", () => {
  expect(getUtf8Size("")).toBe(0);
  expect(getUtf8Size("document-42")).toBe(11);
  expect(getUtf8Size("café")).toBe(new TextEncoder().encode("café").length);
  expect(getUtf8Size("文書")).toBe(6);
  expect(getUtf8Size("📄")).toBe(4);
  expect(getUtf8Size("a📄b文")).toBe(new TextEncoder().encode("a📄b文").length);
});

test("a lone surrogate counts as the replacement it would encode to", () => {
  expect(getUtf8Size("\ud83d")).toBe(3);
  expect(getUtf8Size("\ude00x")).toBe(4);
});
