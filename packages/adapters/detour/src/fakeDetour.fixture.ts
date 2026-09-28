type LinkType = "deferred" | "verified" | "scheme";

// Modelled on @swmansion/react-native-detour 2.3.1: while the mounted DetourProvider processes the launch, the first link it resolves is kept as the launch URL even with listeners attached, and later ones go to the listeners; getInitialURL waits for that processing, answers every call waiting when it ends with the launch URL, and after it hands the URL to the first call only. Every link is handed on as detour://<route> with fromDeepLink and linkType appended, the query serialized by URLSearchParams.
export const createFakeDetour = () => {
  const listeners = new Set<(event: { url: string }) => void>();
  const waiters: ((url: string | undefined) => void)[] = [];
  const calls: string[] = [];

  const state: { finished: boolean; pending: string | undefined } = {
    finished: false,
    pending: undefined,
  };

  const consume = () => {
    const url = state.pending;

    state.pending = undefined;

    return url;
  };

  const sdk = {
    getInitialURL: () => {
      calls.push("getInitialURL");

      if (state.finished) {
        return Promise.resolve(consume());
      }

      return new Promise<string | undefined>((resolve) => {
        waiters.push(resolve);
      });
    },
    addEventListener: (
      event: "url",
      listener: (event: { url: string }) => void,
    ) => {
      const registered = (payload: { url: string }) => listener(payload);

      calls.push(`addEventListener ${event}`);
      listeners.add(registered);

      return {
        remove: () => {
          calls.push("remove");
          listeners.delete(registered);
        },
      };
    },
  };

  return {
    sdk,
    calls,
    resolve: (route: string, linkType: LinkType) => {
      const [pathname = "/", ...search] = route.split("?");
      const params = new URLSearchParams(search.join("?"));

      params.append("fromDeepLink", "true");
      params.append("linkType", linkType);

      const url = `detour://${pathname.replace(/^\//, "")}?${params.toString()}`;

      if (
        !state.finished &&
        (state.pending === undefined || listeners.size === 0)
      ) {
        state.pending = url;

        return;
      }

      for (const listener of [...listeners]) {
        listener({ url });
      }
    },
    finish: () => {
      if (state.finished) {
        return;
      }

      state.finished = true;

      if (waiters.length === 0) {
        return;
      }

      const url = consume();

      for (const resolve of waiters.splice(0)) {
        resolve(url);
      }
    },
    listeners: () => listeners.size,
  };
};
