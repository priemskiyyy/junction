import type { IntentDefinition } from "src/types/IntentDefinition";

/**
 * A registry of intents by name, each made by `intent()`.
 *
 * @example
 * ```ts
 * const intents = { showAnnouncement: intent(z.object({ announcementId: z.string() })) } satisfies Intents;
 * ```
 */
export type Intents = Record<string, IntentDefinition<never, unknown, boolean>>;
