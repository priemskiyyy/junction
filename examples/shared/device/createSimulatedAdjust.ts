import type {
  AdjustConfigLike,
  AdjustDeferredDeeplinkLike,
} from "@priemskiyyy/junction-adjust";

import { ATTRIBUTION_DELAY } from "example-shared/device/constants/attribution";
import type { DeviceLog } from "example-shared/device/types/DeviceLog";

/**
 * react-native-adjust for one launch: the first deferred deep link callback
 * wins, native wires it only if the config has it at `initSdk()`, and on the
 * first launch after an install from a link the attribution delivers that
 * link once it answers.
 */
export const createSimulatedAdjust = ({
  attribution,
  log,
}: {
  attribution: { deeplink: string } | null;
  log: DeviceLog;
}) => {
  const state: {
    callback: ((deferred: AdjustDeferredDeeplinkLike) => void) | null;
    timer: ReturnType<typeof setTimeout> | null;
  } = { callback: null, timer: null };

  const config: AdjustConfigLike & {
    disableDeferredDeeplinkOpening: () => void;
  } = {
    setDeferredDeeplinkCallback: (callback) => {
      log.call("Adjust", "config.setDeferredDeeplinkCallback()");

      if (state.callback === null) {
        state.callback = callback;
      }
    },
    disableDeferredDeeplinkOpening: () => {
      log.call(
        "Adjust",
        "config.disableDeferredDeeplinkOpening()",
        null,
        "folio",
      );
    },
  };

  return {
    config,
    initSdk: () => {
      const { callback } = state;

      log.call(
        "Adjust",
        "Adjust.initSdk(config)",
        attribution === null ? "no attribution" : "attribution pending",
        "folio",
      );

      if (attribution === null || callback === null) {
        return;
      }

      state.timer = setTimeout(() => {
        state.timer = null;
        log.handOff({
          source: { name: "installs" },
          via: "listener",
          label: "Adjust's attribution carried a deferred link",
          detail: attribution.deeplink,
        });
        callback({ deeplink: attribution.deeplink });
      }, ATTRIBUTION_DELAY);
    },
    end: () => {
      if (state.timer !== null) {
        clearTimeout(state.timer);
        state.timer = null;
      }
    },
  };
};
