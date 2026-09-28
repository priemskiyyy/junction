/**
 * What react-native-appsflyer 6 hands its `onDeepLink` callback: the link's
 * values when it was found, AppsFlyer's message when it was not or failed
 * (a string natively, where its declarations say an object), or, when the
 * native payload is not JSON, the parse exception AppsFlyer builds instead.
 *
 * @example
 * ```ts
 * const found: AppsFlyerDeepLinkLike = { deepLinkStatus: "FOUND", isDeferred: false, data: { deep_link_value: "document-42" } };
 * ```
 */
export type AppsFlyerDeepLinkLike =
  | {
      deepLinkStatus: "FOUND";
      isDeferred: boolean;
      data: Record<string, unknown>;
    }
  | {
      deepLinkStatus: "NOT_FOUND" | "ERROR";
      isDeferred: boolean;
      data: string | Record<string, unknown>;
    }
  | { name: "AFParseJSONException"; message: string; data: unknown };
