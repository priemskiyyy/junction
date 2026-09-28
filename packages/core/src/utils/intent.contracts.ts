import { expectTypeOf } from "vitest";
import { z } from "zod";

import type { IntentDefinition } from "src/types/IntentDefinition";
import type { IntentInput } from "src/types/IntentInput";
import type { IntentOptions } from "src/types/IntentOptions";
import type { IntentPayload } from "src/types/IntentPayload";
import type { Intents } from "src/types/Intents";
import type { ValidationResult } from "src/types/ValidationResult";
import type { IntentAccount } from "src/types/internal/IntentAccount";
import { intent } from "src/utils/intent";

const OpenDocument = z.object({
  documentId: z.string(),
  accountId: z.string().optional(),
  count: z.string().transform(Number),
});

const openDocument = intent(OpenDocument, {
  account: ({ accountId }) => {
    expectTypeOf(accountId).toEqualTypeOf<string | undefined>();

    return accountId;
  },
});

const showAnnouncement = intent(z.object({ announcementId: z.string() }));

expectTypeOf<IntentInput<typeof openDocument>>().toEqualTypeOf<{
  documentId: string;
  accountId?: string | undefined;
  count: string;
}>();
expectTypeOf<IntentPayload<typeof openDocument>>().toEqualTypeOf<{
  documentId: string;
  accountId?: string | undefined;
  count: number;
}>();
expectTypeOf<IntentAccount<typeof openDocument>>().toEqualTypeOf<true>();
expectTypeOf<IntentAccount<typeof showAnnouncement>>().toEqualTypeOf<false>();
expectTypeOf(intent(OpenDocument, { account: true })).toEqualTypeOf<
  IntentDefinition<
    { documentId: string; accountId?: string | undefined; count: string },
    { documentId: string; accountId?: string | undefined; count: number },
    true
  >
>();

export const registry = { openDocument, showAnnouncement } satisfies Intents;

// @ts-expect-error A payload is JSON; a Date is not.
intent(z.object({ at: z.date() }));

// @ts-expect-error A payload is a JSON object, not an array.
intent(z.array(z.string()));

// @ts-expect-error A payload is a JSON object, not a string.
intent(z.string());

// @ts-expect-error The account selector reads the payload, which has no workspaceId.
intent(OpenDocument, { account: ({ workspaceId }) => workspaceId });

// @ts-expect-error An account selector answers a string or undefined.
intent(OpenDocument, { account: ({ count }) => count });

// @ts-expect-error An absent account is left out, never written as undefined.
intent(OpenDocument, { account: undefined });

const annotated: IntentOptions<IntentPayload<typeof openDocument>> = {
  account: true,
};

// @ts-expect-error Options annotated as IntentOptions may set an account the types would lose, so they are refused.
intent(OpenDocument, annotated);

const satisfied = {
  account: ({ accountId }) => accountId,
} satisfies IntentOptions<IntentPayload<typeof openDocument>>;

expectTypeOf(intent(OpenDocument, satisfied).account).toEqualTypeOf<true>();

const Stored = z.object({
  documentId: z.string(),
  accountId: z.string().optional(),
  count: z.number(),
});

export const persistent = intent(OpenDocument, {
  account: ({ accountId }) => accountId,
  persist: { schema: Stored },
});

expectTypeOf(persistent.persistent).toEqualTypeOf<boolean>();
expectTypeOf(persistent.restore).returns.toEqualTypeOf<
  ValidationResult<{
    documentId: string;
    accountId?: string | undefined;
    count: number;
  }>
>();

intent(OpenDocument, {
  // @ts-expect-error The stored schema restores the payload consumers receive, where count is a number.
  persist: { schema: OpenDocument.extend({ count: z.string() }) },
});

// @ts-expect-error A persistent intent names the schema of its stored payload.
intent(OpenDocument, { persist: {} });
