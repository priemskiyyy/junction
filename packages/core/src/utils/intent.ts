import type { IntentDefinition } from "src/types/IntentDefinition";
import type { IntentOptions } from "src/types/IntentOptions";
import type { InferInput } from "src/types/internal/InferInput";
import type { InferOutput } from "src/types/internal/InferOutput";
import type { JsonObject } from "src/types/JsonObject";
import type { StandardSchema } from "src/types/StandardSchema";
import {
  DEFAULT_ATTEMPTS,
  DEFAULT_EXPIRY,
  MAX_ATTEMPTS,
} from "src/utils/constants/defaults";
import { resolveCount } from "src/utils/internal/options/resolveCount";
import { resolveDuration } from "src/utils/internal/options/resolveDuration";
import { getRefusal } from "src/utils/internal/payload/getRefusal";
import { validateWithSchema } from "src/utils/internal/payload/validateWithSchema";

/**
 * Declares one intent from a Standard Schema that validates synchronously and
 * produces a JSON object. `account` makes it account-bound; without it the
 * intent is public.
 *
 * @example
 * ```ts
 * export const intents = {
 *   openDocument: intent(
 *     z.object({ documentId: z.string(), accountId: z.string().optional() }),
 *     { account: ({ accountId }) => accountId, expires: { in: 10 * 60_000 } },
 *   ),
 *   showAnnouncement: intent(z.object({ announcementId: z.string() })),
 * };
 * ```
 */
// Overloaded signatures, so the account flag keeps its literal type without a cast.
export function intent<TSchema extends StandardSchema<unknown, JsonObject>>(
  schema: TSchema,
  options: IntentOptions<InferOutput<TSchema>> & {
    account: NonNullable<IntentOptions<InferOutput<TSchema>>["account"]>;
  },
): IntentDefinition<InferInput<TSchema>, InferOutput<TSchema>, true>;
export function intent<TSchema extends StandardSchema<unknown, JsonObject>>(
  schema: TSchema,
  options?: Omit<IntentOptions<InferOutput<TSchema>>, "account"> & {
    account?: never;
  },
): IntentDefinition<InferInput<TSchema>, InferOutput<TSchema>, false>;

export function intent(
  schema: StandardSchema<unknown, JsonObject>,
  options: IntentOptions<unknown> = {},
): IntentDefinition<unknown, unknown, boolean> {
  const { account, persist } = options;

  return Object.freeze({
    version: resolveCount("version", options.version, {
      fallback: 1,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
    expires: Object.freeze({
      in: resolveDuration("expires.in", options.expires?.in, {
        fallback: DEFAULT_EXPIRY,
      }),
    }),
    attempts: resolveCount("attempts", options.attempts, {
      fallback: DEFAULT_ATTEMPTS,
      maximum: MAX_ATTEMPTS,
    }),
    account: account !== undefined,
    parse: (input: unknown) => validateWithSchema(schema, input),
    target: (payload: JsonObject) => {
      if (typeof account !== "function") {
        return undefined;
      }

      return account(payload);
    },
    persistent: persist !== undefined,
    restore: (stored: unknown) => {
      if (persist === undefined) {
        return getRefusal("The intent does not persist.");
      }

      return validateWithSchema(persist.schema, stored);
    },
  });
}
