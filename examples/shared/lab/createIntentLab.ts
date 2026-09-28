import { INVITE_LINK } from "example-shared/device/constants/invites";
import { BRAND_BRIEF_MESSAGE } from "example-shared/device/constants/messages";
import { ADA_MENTION } from "example-shared/device/constants/notificationPresets";
import { DEFAULT_ACTION_ID } from "example-shared/device/constants/notifications";
import { createDevice } from "example-shared/device/createDevice";
import { getNotificationResponse } from "example-shared/device/getNotificationResponse";
import type { LaunchVia } from "example-shared/device/types/LaunchVia";
import type { RealLinking } from "example-shared/device/types/RealLinking";
import type { NotificationPreset } from "example-shared/device/types/NotificationPreset";
import type { ShortcutPreset } from "example-shared/device/types/ShortcutPreset";
import { createFolioApp } from "example-shared/folio/createFolioApp";
import { createFolioWorld } from "example-shared/folio/createFolioWorld";
import { describeEvent } from "example-shared/formatting/describeEvent";
import { describeIntent } from "example-shared/formatting/describeIntent";
import { describeLaunch } from "example-shared/formatting/describeLaunch";
import { formatCount } from "example-shared/formatting/formatCount";
import { createFolioJunction } from "example-shared/junction/createFolioJunction";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";
import { SKIP_AHEAD } from "example-shared/lab/constants/clock";
import {
  NOTICES_LENGTH,
  TIMELINE_LENGTH,
} from "example-shared/lab/constants/logs";
import { SWITCH_LINES } from "example-shared/lab/constants/switchLines";
import { createLabClock } from "example-shared/lab/createLabClock";
import type { Experiment } from "example-shared/lab/types/Experiment";
import type { ExperimentId } from "example-shared/lab/types/ExperimentId";
import type { KnobId, SwitchKnobId } from "example-shared/lab/types/KnobId";
import type { KnownIntent } from "example-shared/lab/types/KnownIntent";
import type { LabNotice } from "example-shared/lab/types/LabNotice";
import type { LabRuntime } from "example-shared/lab/types/LabRuntime";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";
import { createLabStorage } from "example-shared/storage/createLabStorage";
import type { Tone } from "example-shared/types/Tone";
import { EVENT_TONES } from "example-shared/ui/constants/tones";
import { createEventLog } from "example-shared/utils/createEventLog";
import { createTicker } from "example-shared/utils/createTicker";
import { createValueStore } from "example-shared/utils/createValueStore";
import { wait } from "example-shared/utils/wait";

/**
 * The Intent Lab: Folio on a simulated device, where every entry point goes
 * through a real Junction adapter over a simulated SDK. It launches and
 * quits Folio, keeps one timeline across launches, remembers every intent
 * it saw, and breaks Folio's world on request.
 */
export const createIntentLab = ({
  linking = null,
}: {
  /** The phone's own Linking, for the lab on a real device; the lab simulates it by default. */
  linking?: RealLinking | null;
} = {}) => {
  const counter = { last: 0, launches: 0 };

  const getNextId = () => {
    counter.last += 1;

    return counter.last;
  };

  const clock = createLabClock();
  const world = createFolioWorld();
  const device = createDevice({ getNextId, now: clock.now, linking });
  const storage = createLabStorage({ getNextId, now: clock.now });
  const timeline = createEventLog<TimelineEntry>(TIMELINE_LENGTH);
  const notices = createValueStore<LabNotice[]>([]);
  const intents = createValueStore<Record<string, KnownIntent>>({});

  const experiments = createValueStore<
    Partial<Record<ExperimentId, Experiment>>
  >({});

  const busy = createValueStore<KnobId | ExperimentId | "install" | null>(null);
  const listening = { stop: () => {} };

  const getTitle = (documentId: string) =>
    world.state.get().documents.find(({ id }) => id === documentId)?.title ??
    documentId;

  const addLine = (line: string, tone: Tone, launch: { number: number }) => {
    timeline.add({
      id: getNextId(),
      timestamp: clock.now(),
      type: null,
      source: null,
      intent: null,
      line,
      tone,
      launch,
    });
  };

  const addNotice = (notice: Omit<LabNotice, "id">) => {
    notices.set(
      [
        { ...notice, id: getNextId() },
        ...notices.get().filter(({ knob }) => knob !== notice.knob),
      ].slice(0, NOTICES_LENGTH),
    );
  };

  // The label is the one it had when it arrived; the entry is the latest, so a binding made at its first attempt shows.
  const rememberIntents = (entries: FolioInboxEntry[]) => {
    if (entries.length === 0) {
      return;
    }

    const known = intents.get();

    const seen = entries.map((entry): [string, KnownIntent] => [
      entry.id,
      {
        id: entry.id,
        label: known[entry.id]?.label ?? describeIntent(entry, getTitle),
        entry,
      },
    ]);

    intents.set({ ...known, ...Object.fromEntries(seen) });
  };

  const createRuntime = (via: LaunchVia): LabRuntime => {
    const process = device.startProcess(via);
    const app = createFolioApp({ device, world, getNextId });

    const junction = createFolioJunction({
      sdks: process.sdks,
      identity: app.identity,
      storage: storage.storage,
      now: clock.now,
    });

    counter.launches += 1;

    return {
      id: process.id,
      number: counter.launches,
      state: "running",
      via,
      process,
      app,
      junction,
      report: null,
    };
  };

  const runtime = createValueStore<LabRuntime>(createRuntime({ kind: "icon" }));

  const listen = (current: LabRuntime) => {
    const launch = { number: current.number };

    const stops = [
      current.junction.diagnostics.events.subscribe((event) => {
        timeline.add({
          id: getNextId(),
          timestamp: event.timestamp,
          type: event.type,
          source: event.source,
          intent: event.intent,
          line: describeEvent(event, current.app.identity.get()),
          tone: EVENT_TONES[event.type],
          launch,
        });
      }),
      current.junction.inbox.subscribe(() => {
        rememberIntents(current.junction.inbox.get());
      }),
    ];

    listening.stop = () => {
      for (const stop of stops) {
        stop();
      }
    };
  };

  // Folio's own start: Junction first, then Adjust, which wires only a callback the config already has.
  const start = async (current: LabRuntime) => {
    listen(current);
    addLine(describeLaunch(current.via), "info", {
      number: current.number,
    });

    const started = current.junction.start();

    current.process.disableAdjustOpening();
    current.process.initAdjust();

    const report = await started;

    if (runtime.get().id !== current.id) {
      return;
    }

    runtime.set({ ...runtime.get(), report });
  };

  const launch = (via: LaunchVia) => {
    const next = createRuntime(via);

    runtime.set(next);

    return start(next);
  };

  const quit = () => {
    const current = runtime.get();

    if (current.state === "quit") {
      return;
    }

    current.junction.dispose();
    current.process.end();
    current.app.end();
    listening.stop();
    runtime.set({ ...current, state: "quit" });
    addLine("Folio quit, and its process ended", "neutral", {
      number: current.number,
    });
  };

  const sendOrLaunch = (
    send: (current: LabRuntime) => void,
    via: LaunchVia,
  ) => {
    const current = runtime.get();

    if (current.state === "quit") {
      return launch(via);
    }

    send(current);

    return Promise.resolve();
  };

  const runAction = async (
    id: KnobId | ExperimentId | "install",
    action: () => Promise<void>,
  ) => {
    if (busy.get() !== null) {
      return;
    }

    busy.set(id);

    try {
      await action();
    } finally {
      busy.set(null);
    }
  };

  const countIntents = () =>
    runtime.get().junction.diagnostics.get().intents.length;

  const restart = () =>
    runAction("restart", async () => {
      const before = countIntents();

      quit();
      await launch({ kind: "icon" });

      addNotice({
        knob: "restart",
        tone: "positive",
        title: "Only persistent intents survive a restart",
        body: `Folio's inbox held ${formatCount(before, "intent")}, and ${formatCount(countIntents(), "intent")} came back from storage. A mention or a new document lives in memory, and a restart forgets it.`,
      });
    });

  const corruptStorage = () =>
    runAction("corrupt", async () => {
      quit();
      storage.corrupt();
      await launch({ kind: "icon" });

      addNotice({
        knob: "corrupt",
        tone: "positive",
        title: "An unreadable inbox blocks storage, and never empties it",
        body: "Junction read a saved inbox it cannot trust and blocked storage instead of starting over. Links to documents are refused until you reset storage; a mention or a shortcut still runs.",
      });
    });

  const skipAhead = () =>
    runAction("skip-ahead", async () => {
      const since = counter.last;

      clock.skip(SKIP_AHEAD);
      addLine("Junction's clock skipped ahead 11 minutes", "accent", {
        number: runtime.get().number,
      });
      runtime.get().junction.refresh();
      await wait(0);

      const expired = timeline.log
        .get()
        .filter(
          ({ id, type }) => id > since && type === "intent expired",
        ).length;

      addNotice({
        knob: "skip-ahead",
        tone: "positive",
        title: "Every intent has a deadline",
        body: `${formatCount(expired, "intent")} expired. An intent waits ten minutes at most, and past its deadline it never runs.`,
      });
    });

  const setSwitch = (
    id: SwitchKnobId,
    on: boolean,
    apply: (on: boolean) => void,
  ) => {
    apply(on);
    addLine(SWITCH_LINES[id][on ? "on" : "off"], on ? "warning" : "neutral", {
      number: runtime.get().number,
    });
  };

  const setExperiment = (next: Experiment) => {
    experiments.set({ ...experiments.get(), [next.id]: next });
  };

  const runExperiment = (id: ExperimentId) =>
    runAction(id, async () => {
      if (id === "tap-twice") {
        if (runtime.get().state === "quit") {
          await launch({ kind: "icon" });
        }

        const since = counter.last;

        setExperiment({ id, since, state: "running" });
        runtime.get().process.openLink(BRAND_BRIEF_MESSAGE.url);
        runtime.get().process.openLink(BRAND_BRIEF_MESSAGE.url);
        await wait(0);
        setExperiment({ id, since, state: "done" });

        return;
      }

      const { race } = device.state.get();
      const since = counter.last;

      setExperiment({ id, since, state: "running" });
      device.setRace(true);
      quit();
      await launch({
        kind: "notification",
        response: getNotificationResponse(ADA_MENTION, DEFAULT_ACTION_ID),
      });
      device.setRace(race);
      setExperiment({ id, since, state: "done" });
    });

  const started = start(runtime.get());

  return {
    started,
    now: clock.now,
    ticker: createTicker({ now: clock.now, interval: 1_000 }),
    world,
    device: {
      state: device.state,
      calls: device.calls,
      handOffs: device.handOffs,
    },
    storage: { state: storage.state },
    runtime: { get: runtime.get, subscribe: runtime.subscribe },
    timeline: timeline.log,
    notices: { get: notices.get, subscribe: notices.subscribe },
    intents: { get: intents.get, subscribe: intents.subscribe },
    experiments: { get: experiments.get, subscribe: experiments.subscribe },
    busy: { get: busy.get, subscribe: busy.subscribe },
    getTitle,
    openApp: () => {
      if (runtime.get().state === "running") {
        return Promise.resolve();
      }

      return launch({ kind: "icon" });
    },
    quit,
    openLink: async (url: string) => {
      if (runtime.get().state === "quit" && !device.launchesFromLinks) {
        await launch({ kind: "icon" });
      }

      await sendOrLaunch((current) => current.process.openLink(url), {
        kind: "link",
        url,
      });
    },
    pressNotification: (preset: NotificationPreset, actionId: string) => {
      const response = getNotificationResponse(preset, actionId);

      return sendOrLaunch(
        (current) => current.process.pressNotification(response),
        { kind: "notification", response },
      );
    },
    chooseShortcut: ({ action }: ShortcutPreset) =>
      sendOrLaunch((current) => current.process.performShortcut(action), {
        kind: "shortcut",
        action,
      }),
    installFromInvite: () =>
      runAction("install", async () => {
        quit();
        storage.clear();
        device.installFrom({ deeplink: INVITE_LINK.deeplink });
        addLine(
          "Folio was deleted, then installed again from Ada's invite link",
          "accent",
          { number: runtime.get().number },
        );
        await launch({ kind: "icon" });
      }),
    setSlow: (on: boolean) => {
      setSwitch("slow", on, world.setSlow);
    },
    setOffline: (on: boolean) => {
      setSwitch("offline", on, world.setOffline);
    },
    setFailingWrites: (on: boolean) => {
      setSwitch("failing-writes", on, storage.setFailing);
    },
    setRace: (on: boolean) => {
      setSwitch("race", on, device.setRace);
    },
    restart,
    corruptStorage,
    skipAhead,
    runExperiment,
    dismissNotice: (id: number) => {
      notices.set(notices.get().filter((notice) => notice.id !== id));
    },
    reset: async () => {
      quit();
      world.reset();
      storage.clear();
      device.reset();
      clock.reset();
      timeline.log.clear();
      notices.set([]);
      intents.set({});
      experiments.set({});
      await launch({ kind: "icon" });
    },
    dispose: () => {
      quit();
    },
  };
};
