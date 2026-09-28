/**
 * What the source pushes: the URL Detour resolved, `detour://` and the
 * link's route, without the `fromDeepLink` and `linkType` parameters Detour
 * appends, so URL routes match it.
 *
 * @example
 * ```ts
 * const input: DetourInput = { url: "detour://documents/42" };
 * ```
 */
export type DetourInput = { url: string };
