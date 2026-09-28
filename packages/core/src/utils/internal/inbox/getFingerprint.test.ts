import { expect, test } from "vitest";

import { getFingerprint } from "src/utils/internal/inbox/getFingerprint";

test("a fingerprint is stable, short, and tells names and payloads apart", () => {
  const text = JSON.stringify({ documentId: "document-42".repeat(1_000) });

  expect(getFingerprint("openDocument", text)).toBe(
    getFingerprint("openDocument", text),
  );
  expect(getFingerprint("openDocument", text).length).toBeLessThanOrEqual(11);
  expect(getFingerprint("openDocument", text)).not.toBe(
    getFingerprint("openFolder", text),
  );
  expect(getFingerprint("openDocument", '{"documentId":"a"}')).not.toBe(
    getFingerprint("openDocument", '{"documentId":"b"}'),
  );
});
