/**
 * What the source pushes for every deep link AppsFlyer finds: the link's
 * values under AppsFlyer's own names, such as `deep_link_value`.
 *
 * @example
 * ```ts
 * const input: AppsFlyerInput = { params: { deep_link_value: "document-42", deep_link_sub1: "workspace-7" } };
 * ```
 */
export type AppsFlyerInput = { params: Record<string, unknown> };
