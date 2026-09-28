import type { JunctionIdentity } from "@priemskiyyy/junction";

import type { Device } from "example-shared/device/types/Device";
import { RESTORE_DELAY } from "example-shared/folio/constants/restore";
import type { DocumentTarget } from "example-shared/folio/types/DocumentTarget";
import type { FolioWorld } from "example-shared/folio/types/FolioWorld";
import type { NavigationState } from "example-shared/folio/types/NavigationState";
import type { PaneState } from "example-shared/folio/types/PaneState";
import type { PersonId } from "example-shared/folio/types/PersonId";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";
import type { Tone } from "example-shared/types/Tone";
import { createValueStore } from "example-shared/utils/createValueStore";

const SIGNED_OUT: NavigationState = { panes: [], banner: null };

/**
 * Folio for one launch: who is signed in, restored from the device at
 * launch, and what its screen shows. Intent handlers change the screen only
 * through `show()`, inside their commit.
 */
export const createFolioApp = ({
  device,
  world,
  getNextId,
}: {
  device: Device;
  world: FolioWorld;
  getNextId: () => number;
}) => {
  const identity = createValueStore<JunctionIdentity>({ status: "restoring" });
  const navigation = createValueStore<NavigationState>(SIGNED_OUT);

  const getHome = (person: PersonId): PaneState => ({
    workspace: { id: world.state.get().memberships[person][0] ?? "finance" },
    document: null,
    editing: false,
  });

  const updatePane = (index: number, changes: Partial<PaneState>) => {
    const current = navigation.get();

    navigation.set({
      ...current,
      panes: current.panes.map((pane, candidate) => {
        if (candidate !== index) {
          return pane;
        }

        return { ...pane, ...changes };
      }),
    });
  };

  const enter = (person: PersonId) => {
    navigation.set({ panes: [getHome(person)], banner: null });
  };

  const restore = setTimeout(() => {
    const { session } = device.state.get();

    if (session === null) {
      identity.set({ status: "anonymous" });

      return;
    }

    enter(session.person.id);
    identity.set({
      status: "authenticated",
      account: { id: session.person.id },
    });
  }, RESTORE_DELAY);

  const getPaneFor = (workspaceId: WorkspaceId) => {
    const index = navigation
      .get()
      .panes.findIndex((pane) => pane.workspace.id === workspaceId);

    if (index === -1) {
      return 0;
    }

    return index;
  };

  return {
    identity: { get: identity.get, subscribe: identity.subscribe },
    navigation: { get: navigation.get, subscribe: navigation.subscribe },
    signIn: (person: PersonId) => {
      device.saveSession(person);
      enter(person);
      identity.set({ status: "authenticated", account: { id: person } });
    },
    signOut: () => {
      device.saveSession(null);
      navigation.set(SIGNED_OUT);
      identity.set({ status: "anonymous" });
    },
    selectWorkspace: (index: number, workspaceId: WorkspaceId) => {
      updatePane(index, {
        workspace: { id: workspaceId },
        document: null,
        editing: false,
      });
    },
    setSplit: (split: boolean) => {
      const current = navigation.get();
      const [first] = current.panes;

      if (first === undefined) {
        return;
      }

      if (!split) {
        navigation.set({ ...current, panes: [first] });

        return;
      }

      navigation.set({
        ...current,
        panes: [first, { ...first, document: null, editing: false }],
      });
    },
    setEditing: (index: number, editing: boolean) => {
      updatePane(index, { editing });
    },
    closeDocument: (index: number) => {
      updatePane(index, { document: null, editing: false });
    },
    /** Shows a document in the pane given, or else in the pane on its workspace, or else in the first pane. */
    show: (target: DocumentTarget, index = getPaneFor(target.workspaceId)) => {
      updatePane(index, {
        workspace: { id: target.workspaceId },
        document: {
          id: target.documentId,
          comment:
            target.commentId === undefined ? null : { id: target.commentId },
        },
        editing: false,
      });
    },
    /** The workspace a pane shows, the first pane's by default, or `null` when nobody is signed in. */
    getWorkspace: (index = 0) =>
      navigation.get().panes[index]?.workspace ?? null,
    announce: (text: string, tone: Tone = "positive") => {
      navigation.set({
        ...navigation.get(),
        banner: { id: getNextId(), text, tone },
      });
    },
    dismissBanner: () => {
      navigation.set({ ...navigation.get(), banner: null });
    },
    end: () => {
      clearTimeout(restore);
    },
  };
};
