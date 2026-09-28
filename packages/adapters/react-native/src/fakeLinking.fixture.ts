type Call =
  | ["addEventListener", "url"]
  | ["remove"]
  | ["getInitialURL"]
  | ["openURL", string]
  | ["canOpenURL", string]
  | ["openSettings"]
  | ["sendIntent", string];

type Registration = { listener: (event: { url: string }) => unknown };

// Modelled on React Native 0.86.3's Linking: an EventEmitter registration per listener, and a launch read that resolves null, undefined or the URL.
export const createFakeLinking = ({
  initial = null,
}: { initial?: string | null | undefined } = {}) => {
  const registrations = new Set<Registration>();
  const calls: Call[] = [];

  const launch: { url: string | null | undefined; error: unknown } = {
    url: initial,
    error: null,
  };

  const sdk = {
    addEventListener: (
      eventType: "url",
      listener: (event: { url: string }) => unknown,
    ) => {
      const registration: Registration = { listener };

      calls.push(["addEventListener", eventType]);
      registrations.add(registration);

      return {
        remove: () => {
          calls.push(["remove"]);
          registrations.delete(registration);
        },
      };
    },
    getInitialURL: (): Promise<string | null | undefined> => {
      calls.push(["getInitialURL"]);

      if (launch.error !== null) {
        return Promise.reject(launch.error);
      }

      return Promise.resolve(launch.url);
    },
    openURL: (url: string) => {
      calls.push(["openURL", url]);

      return Promise.resolve();
    },
    canOpenURL: (url: string) => {
      calls.push(["canOpenURL", url]);

      return Promise.resolve(true);
    },
    openSettings: () => {
      calls.push(["openSettings"]);

      return Promise.resolve();
    },
    sendIntent: (action: string) => {
      calls.push(["sendIntent", action]);

      return Promise.resolve();
    },
  };

  return {
    sdk,
    calls,
    open: (url: string) => {
      for (const registration of [...registrations]) {
        registration.listener({ url });
      }
    },
    launch: (url: string | null | undefined) => {
      launch.url = url;
    },
    failLaunch: (error: unknown) => {
      launch.error = error;
    },
    listeners: () => registrations.size,
  };
};
