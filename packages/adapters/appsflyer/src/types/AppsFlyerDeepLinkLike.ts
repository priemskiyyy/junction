/**
 * What AppsFlyer 7 hands its deep link callback: the result normalized onto
 * `FOUND`, `NOT_FOUND` or `ERROR`, with the link's values in `deepLink`.
 *
 * @example
 * ```ts
 * const found: AppsFlyerDeepLinkLike = { status: "FOUND", deepLink: { deep_link_value: "document-42", is_deferred: false } };
 * ```
 */
export type AppsFlyerDeepLinkLike = {
  status: "FOUND" | "NOT_FOUND" | "ERROR";
  error?: string;
  deepLink?: Record<string, unknown>;
};
