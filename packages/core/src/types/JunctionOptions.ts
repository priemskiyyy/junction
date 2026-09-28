import type { InboxStorage } from "src/types/InboxStorage";
import type { IntentAccount } from "src/types/internal/IntentAccount";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { ObservableValue } from "src/types/ObservableValue";
import type { Route } from "src/types/Route";
import type { RouteBuilders } from "src/types/RouteBuilders";

type IsAccountBound<TIntents> = true extends {
  [TName in keyof TIntents]: IntentAccount<TIntents[TName]>;
}[keyof TIntents]
  ? true
  : false;

/**
 * Everything a Junction is made of: its intents, its sources and their
 * routes, the identity account-bound intents need, the storage persistent ones
 * need, the timeouts and the clock. Only `intents` is required, `identity`
 * once an intent is account-bound and `storage` once one persists.
 *
 * @example
 * ```ts
 * const options: JunctionOptions<typeof intents, typeof sources> = { intents, sources, identity };
 * ```
 */
export type JunctionOptions<TIntents, TSources> = {
  intents: TIntents;
  sources?: TSources | undefined;
  /** The routes by id, built with each source's typed builders. */
  routes?:
    | ((builders: {
        from: RouteBuilders<TIntents, TSources>;
      }) => Record<string, Route>)
    | undefined;
  timeout?:
    | {
        /** How long `start()` waits for a source's launch read: 2 000 milliseconds by default. */
        initial?: number | undefined;
        /** How long one handler attempt may run before it is invalidated: 30 000 milliseconds by default. */
        execution?: number | undefined;
        /** How long one storage read or write may take before it counts as failed: 10 000 milliseconds by default. */
        storage?: number | undefined;
      }
    | undefined;
  /** The wall clock every time Junction reads comes from, `Date.now` by default. */
  now?: (() => number) | undefined;
  /** Where persistent intents survive a restart; required once an intent persists. */
  storage?: InboxStorage | undefined;
} & (IsAccountBound<TIntents> extends true
  ? {
      /** The application's read-only identity, required once an intent is account-bound. */
      identity: ObservableValue<JunctionIdentity>;
    }
  : { identity?: ObservableValue<JunctionIdentity> | undefined });
