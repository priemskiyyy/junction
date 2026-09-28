import type { LinkingLike } from "@priemskiyyy/junction-react-native";

import type { DeviceLog } from "example-shared/device/types/DeviceLog";

/** React Native's `Linking` for one launch: the URL the app opened with, and `url` events only for the listeners it has when a link opens. */
export const createSimulatedLinking = ({
  launchUrl,
  log,
}: {
  launchUrl: string | null;
  log: DeviceLog;
}) => {
  const listeners = new Set<(event: { url: string }) => void>();

  const sdk: LinkingLike = {
    addEventListener: (type, listener) => {
      log.call("Linking", `addEventListener("${type}")`);
      listeners.add(listener);

      return {
        remove: () => {
          log.call("Linking", "subscription.remove()");
          listeners.delete(listener);
        },
      };
    },
    getInitialURL: () => {
      log.call("Linking", "getInitialURL()", launchUrl ?? "null");

      if (launchUrl !== null) {
        log.handOff({
          source: { name: "links" },
          via: "launch-read",
          label: "The link Folio opened with",
          detail: launchUrl,
        });
      }

      return Promise.resolve(launchUrl);
    },
  };

  return {
    sdk,
    open: (url: string) => {
      for (const listener of [...listeners]) {
        log.handOff({
          source: { name: "links" },
          via: "listener",
          label: "A link opened while Folio runs",
          detail: url,
        });
        listener({ url });
      }
    },
    end: () => {
      listeners.clear();
    },
  };
};
