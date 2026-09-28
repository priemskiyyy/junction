import { expect, test } from "vitest";
import { z } from "zod";

import type { IntentDefinition } from "src/types/IntentDefinition";
import type { RestorableIntent } from "src/types/internal/RestorableIntent";
import { intent } from "src/utils/intent";
import { getFingerprint } from "src/utils/internal/inbox/getFingerprint";
import { getRestoredInbox } from "src/utils/internal/storage/getRestoredInbox";

const OpenDocument = z
  .object({ workspaceId: z.string(), documentId: z.string() })
  .strict();

const definitions = new Map<
  string,
  IntentDefinition<unknown, unknown, boolean>
>([
  [
    "openDocument",
    intent(OpenDocument, {
      account: true,
      version: 2,
      persist: { schema: OpenDocument },
    }),
  ],
  ["showAnnouncement", intent(z.object({ announcementId: z.string() }))],
]);

const stored: RestorableIntent = {
  id: "intent-1",
  name: "openDocument",
  version: 2,
  payload: { workspaceId: "w", documentId: "d" },
  binding: { kind: "bound", account: { id: "account-3" } },
  timestamp: 1_000,
  expires: { at: 601_000 },
  provenance: { kind: "dispatch" },
  attempts: 1,
  interaction: { key: '["dispatch","press-1"]' },
  state: { state: "pending" },
};

test("a stored intent comes back with its id, payload, deadline, binding and attempts, frozen", () => {
  const { records, quarantined } = getRestoredInbox([stored], definitions);

  expect(quarantined).toEqual([]);
  expect(records).toEqual([
    {
      record: expect.objectContaining({
        id: "intent-1",
        name: "openDocument",
        payload: { workspaceId: "w", documentId: "d" },
        timestamp: 1_000,
        expiresAt: 601_000,
        binding: { kind: "bound", account: { id: "account-3" } },
        attempts: 1,
        interaction: '["dispatch","press-1"]',
        current: { state: "ADMITTED" },
      }),
      fingerprint: getFingerprint(
        "openDocument",
        '{"documentId":"d","workspaceId":"w"}',
      ),
    },
  ]);
  expect(Object.isFrozen(records[0]?.record.payload)).toBe(true);
  expect(Object.isFrozen(records[0]?.record.binding)).toBe(true);
});

test.each<[RestorableIntent["state"], unknown]>([
  [
    { state: "retry-scheduled", retry: { at: 9_000 } },
    { state: "RETRY_SCHEDULED", at: 9_000 },
  ],
  [
    { state: "failed", error: { code: "HANDLER_FAILED" } },
    {
      state: "FAILED",
      error: expect.objectContaining({
        code: "HANDLER_FAILED",
        message: "The handler threw.",
      }),
    },
  ],
  [
    { state: "interrupted", error: { code: "TIMED_OUT" } },
    {
      state: "INTERRUPTED",
      error: expect.objectContaining({ code: "TIMED_OUT" }),
    },
  ],
  [
    { state: "leased" },
    {
      state: "INTERRUPTED",
      error: expect.objectContaining({
        code: "PROCESS_RESTARTED",
        message:
          "The process ended while the attempt held its lease, so its effect may or may not have happened.",
      }),
    },
  ],
])("a stored %o comes back as %o", (state, current) => {
  const { records } = getRestoredInbox([{ ...stored, state }], definitions);

  expect(records[0]?.record.current).toEqual(current);
});

test.each<[string, Partial<RestorableIntent>]>([
  ["unknown-intent", { name: "openFolder" }],
  ["not-persistent", { name: "showAnnouncement" }],
  ["unsupported-version", { version: 1 }],
  ["binding-mismatch", { binding: { kind: "public" } }],
  ["invalid-payload", { payload: { workspaceId: "w" } }],
])(
  "an intent the current definition would not accept is quarantined as %s, keeping its interaction for a tombstone",
  (reason, overrides) => {
    const { records, quarantined } = getRestoredInbox(
      [{ ...stored, ...overrides }],
      definitions,
    );

    expect(records).toEqual([]);
    expect(quarantined).toEqual([
      {
        id: "intent-1",
        reason,
        interaction: {
          key: '["dispatch","press-1"]',
          fingerprint: expect.any(String),
        },
      },
    ]);
  },
);
