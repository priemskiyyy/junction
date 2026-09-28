import type { IncomingSource } from "src/types/IncomingSource";

/**
 * The SDK a source was given, typed as the application's own.
 *
 * @example
 * ```ts
 * type Native = SourceNative<ReturnType<typeof linking>>;
 * ```
 */
export type SourceNative<TSource> =
  TSource extends IncomingSource<unknown, infer TNative> ? TNative : never;
