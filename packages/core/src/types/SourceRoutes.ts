import type { EventRouteOptions } from "src/types/EventRouteOptions";
import type { Route } from "src/types/Route";
import type { UrlRouteOptions } from "src/types/UrlRouteOptions";

/**
 * The route builders of one source: `event` for every source, `url` for a
 * source whose input carries a `url`.
 *
 * @example
 * ```ts
 * routes: ({ from }) => ({ documentUrl: from.links.url({ url, intent: "openDocument", payload }) }),
 * ```
 */
export type SourceRoutes<TIntents, TInput> = {
  event: <TName extends keyof TIntents & string>(
    route: EventRouteOptions<TIntents, TInput, TName>,
  ) => Route;
  url: <
    TName extends keyof TIntents & string,
    TPattern extends `${string}://${string}`,
  >(
    route: TInput extends { url: string }
      ? UrlRouteOptions<TIntents, TInput, TName, TPattern>
      : never,
  ) => Route;
};
