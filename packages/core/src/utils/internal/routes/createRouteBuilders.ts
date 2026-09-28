import type { Route } from "src/types/Route";
import type { RouteBuilders } from "src/types/RouteBuilders";
import type { SourceRoutes } from "src/types/SourceRoutes";

const alwaysMatch = () => true;

const createSourceRoutes = <TIntents, TInput>(
  source: string,
): SourceRoutes<TIntents, TInput> => ({
  event: (route): Route =>
    Object.freeze({
      kind: "event",
      source: Object.freeze({ name: source }),
      intent: Object.freeze({ name: route.intent }),
      match: route.match ?? alwaysMatch,
      payload: route.payload,
    }),
  url: (route): Route =>
    Object.freeze({
      kind: "url",
      source: Object.freeze({ name: source }),
      intent: Object.freeze({ name: route.intent }),
      url: route.url,
      payload: route.payload,
    }),
});

// The overload keeps the source-to-input relation that building the builders by name erases.
export function createRouteBuilders<TIntents, TSources>(
  sources: string[],
): RouteBuilders<TIntents, TSources>;

export function createRouteBuilders(
  sources: string[],
): Record<string, SourceRoutes<unknown, unknown>> {
  return Object.freeze(
    Object.fromEntries(
      sources.map((source) => [source, createSourceRoutes(source)]),
    ),
  );
}
