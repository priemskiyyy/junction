import type { IncomingSource } from "src/types/IncomingSource";

/**
 * The sources of a Junction by name.
 *
 * @example
 * ```ts
 * const sources = { links: linking({ sdk: Linking }) } satisfies Sources;
 * ```
 */
export type Sources = Record<string, IncomingSource<unknown, unknown>>;
