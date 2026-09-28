/**
 * What the source pushes: the deferred deep link as a URL, so URL routes
 * match it as they match a Linking URL.
 *
 * @example
 * ```ts
 * const input: AdjustInput = { url: "myapp://documents/42" };
 * ```
 */
export type AdjustInput = { url: string };
