import { createDeviceLog } from "example-shared/device/createDeviceLog";
import { createSimulatedAdjust } from "example-shared/device/createSimulatedAdjust";
import { createSimulatedLinking } from "example-shared/device/createSimulatedLinking";
import { createSimulatedNotifications } from "example-shared/device/createSimulatedNotifications";
import { createSimulatedQuickActions } from "example-shared/device/createSimulatedQuickActions";
import type { DeviceState } from "example-shared/device/types/DeviceState";
import type { LaunchVia } from "example-shared/device/types/LaunchVia";
import type { RealLinking } from "example-shared/device/types/RealLinking";
import type { PersonId } from "example-shared/folio/types/PersonId";
import { createValueStore } from "example-shared/utils/createValueStore";

const INITIAL_STATE: DeviceState = {
  install: { link: null, launches: 1 },
  session: null,
  race: false,
};

/**
 * The lab's phone: how Folio was installed, the sign-in it keeps, and one
 * process per launch with fresh SDKs, which the real Junction adapters
 * listen to.
 */
export const createDevice = ({
  getNextId,
  now,
  linking: realLinking = null,
}: {
  getNextId: () => number;
  now: () => number;
  linking?: RealLinking | null;
}) => {
  const log = createDeviceLog({ getNextId, now });
  const state = createValueStore<DeviceState>(INITIAL_STATE);

  const update = (changes: Partial<DeviceState>) => {
    state.set({ ...state.get(), ...changes });
  };

  // On a real phone the links source listens to the device's own Linking, which outlives every launch of the lab.
  const getLinking = (via: LaunchVia) => {
    if (realLinking !== null) {
      return { ...realLinking, end: () => {} };
    }

    return createSimulatedLinking({
      launchUrl: via.kind === "link" ? via.url : null,
      log,
    });
  };

  const startProcess = (via: LaunchVia) => {
    const { install, race } = state.get();

    update({ install: { ...install, launches: install.launches + 1 } });

    const linking = getLinking(via);

    const notifications = createSimulatedNotifications({
      launchResponse: via.kind === "notification" ? via.response : null,
      race,
      log,
    });

    const quickActions = createSimulatedQuickActions({
      launchAction: via.kind === "shortcut" ? via.action : null,
      log,
    });

    const adjust = createSimulatedAdjust({
      attribution: install.launches === 0 ? install.link : null,
      log,
    });

    return {
      id: getNextId(),
      via,
      sdks: {
        linking: linking.sdk,
        notifications: notifications.sdk,
        quickActions: quickActions.sdk,
        adjust: adjust.config,
      },
      openLink: linking.open,
      pressNotification: notifications.press,
      performShortcut: quickActions.perform,
      initAdjust: adjust.initSdk,
      disableAdjustOpening: adjust.config.disableDeferredDeeplinkOpening,
      end: () => {
        linking.end();
        notifications.end();
        quickActions.end();
        adjust.end();
      },
    };
  };

  return {
    state: { get: state.get, subscribe: state.subscribe },
    /** Whether a link can launch Folio cold here: on a real phone the OS owns the launch URL. */
    launchesFromLinks: realLinking === null,
    calls: log.calls,
    handOffs: log.handOffs,
    startProcess,
    saveSession: (person: PersonId | null) => {
      update({ session: person === null ? null : { person: { id: person } } });
    },
    setRace: (race: boolean) => {
      update({ race });
    },
    installFrom: (link: { deeplink: string } | null) => {
      update({ install: { link, launches: 0 }, session: null });
    },
    reset: () => {
      state.set(INITIAL_STATE);
      log.calls.clear();
      log.handOffs.clear();
    },
  };
};
