import type { BranchOpenEventLike } from "src/types/BranchOpenEventLike";

type LaunchEvent = Extract<BranchOpenEventLike, { error: null | undefined }>;

type Subscriber = {
  onOpenComplete: (event: BranchOpenEventLike) => void;
  subscribed: boolean;
};

// Modelled on react-native-branch 7.0.0: only the app's first subscribe() redeems the cached launch session, asynchronously and marked +rn_cached_initial_event, and wires its live listeners once that check settles, even after an unsubscribe in between, which then can never remove them; every live open, errors included, reaches each wired onOpenComplete.
export const createFakeBranch = () => {
  const wired = new Set<Subscriber>();
  const calls: string[] = [];

  const state: { cached: LaunchEvent | null; checkCached: boolean } = {
    cached: null,
    checkCached: true,
  };

  const subscribers = new Set<Subscriber>();

  const sdk = {
    subscribe: (options: {
      onOpenComplete: (event: BranchOpenEventLike) => void;
    }) => {
      const subscriber: Subscriber = {
        onOpenComplete: options.onOpenComplete,
        subscribed: true,
      };

      calls.push("subscribe");
      subscribers.add(subscriber);

      if (state.checkCached) {
        state.checkCached = false;

        Promise.resolve().then(() => {
          const { cached } = state;

          if (cached !== null) {
            subscriber.onOpenComplete({
              ...cached,
              params: { ...cached.params, "+rn_cached_initial_event": true },
            });
          }

          wired.add(subscriber);
        });
      } else {
        wired.add(subscriber);
      }

      return () => {
        if (!subscriber.subscribed) {
          return;
        }

        calls.push("unsubscribe");
        subscriber.subscribed = false;
        subscribers.delete(subscriber);
        wired.delete(subscriber);
      };
    },
    openURL: (url: string) => {
      calls.push(`openURL ${url}`);
    },
    getLatestReferringParams: () => {
      calls.push("getLatestReferringParams");

      return Promise.resolve({});
    },
    getFirstReferringParams: () => {
      calls.push("getFirstReferringParams");

      return Promise.resolve({});
    },
    setIdentity: (identity: string) => {
      calls.push(`setIdentity ${identity}`);
    },
    logout: () => {
      calls.push("logout");
    },
    disableTracking: (disable: boolean) => {
      calls.push(`disableTracking ${String(disable)}`);
    },
  };

  return {
    sdk,
    calls,
    launch: (event: LaunchEvent) => {
      state.cached = event;
    },
    open: (event: BranchOpenEventLike) => {
      for (const subscriber of [...wired]) {
        subscriber.onOpenComplete(event);
      }
    },
    subscribers: () => subscribers.size,
    wired: () => wired.size,
  };
};
