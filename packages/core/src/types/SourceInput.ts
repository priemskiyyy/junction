import type { IncomingSource } from "src/types/IncomingSource";

/**
 * The normalized input a source pushes, which its routes receive.
 *
 * @example
 * ```ts
 * type LinkInput = SourceInput<ReturnType<typeof linking>>; // { url: string }
 * ```
 */
export type SourceInput<TSource> =
  TSource extends IncomingSource<infer TInput, unknown> ? TInput : never;
