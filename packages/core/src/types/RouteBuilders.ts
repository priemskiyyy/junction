import type { SourceInput } from "src/types/SourceInput";
import type { SourceRoutes } from "src/types/SourceRoutes";

/**
 * What `routes` receives: one set of typed route builders per source.
 *
 * @example
 * ```ts
 * routes: ({ from }: { from: RouteBuilders<typeof intents, typeof sources> }) => ({}),
 * ```
 */
export type RouteBuilders<TIntents, TSources> = {
  [TKey in keyof TSources]: SourceRoutes<TIntents, SourceInput<TSources[TKey]>>;
};
