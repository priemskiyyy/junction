/**
 * What the source pushes for every link: the URL exactly as the operating
 * system delivered it, which routes match with `from.<source>.url(...)`.
 *
 * @example
 * ```ts
 * const input: LinkingInput = { url: "https://app.example.com/documents/42" };
 * ```
 */
export type LinkingInput = { url: string };
