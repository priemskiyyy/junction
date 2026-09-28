import { DOCUMENTS } from "example-shared/folio/constants/documents";
import { INVITES } from "example-shared/folio/constants/invites";
import {
  DOCUMENT_LATENCY,
  SLOW_DOCUMENT_LATENCY,
} from "example-shared/folio/constants/latency";
import { INITIAL_MEMBERSHIPS } from "example-shared/folio/constants/memberships";
import { TEMPLATES } from "example-shared/folio/constants/templates";
import { isPersonId } from "example-shared/folio/isPersonId";
import type { DocumentAnswer } from "example-shared/folio/types/DocumentAnswer";
import type { DocumentTemplate } from "example-shared/folio/types/DocumentTemplate";
import type { FolioDocument } from "example-shared/folio/types/FolioDocument";
import type { InviteAnswer } from "example-shared/folio/types/InviteAnswer";
import type { WorkspaceId } from "example-shared/folio/types/WorkspaceId";
import type { WorldState } from "example-shared/folio/types/WorldState";
import { createValueStore } from "example-shared/utils/createValueStore";
import { wait } from "example-shared/utils/wait";

const getInitialState = (): WorldState => ({
  memberships: {
    ada: [...INITIAL_MEMBERSHIPS.ada],
    grace: [...INITIAL_MEMBERSHIPS.grace],
  },
  documents: [...DOCUMENTS],
  slow: false,
  offline: false,
});

/**
 * Folio's server side, inside the page: the document service handlers ask,
 * with its latency and its outage, and the memberships an invite changes.
 * It outlives every launch of the app.
 */
export const createFolioWorld = () => {
  const state = createValueStore<WorldState>(getInitialState());

  const answerAfterLatency = async (signal: AbortSignal) => {
    await wait(
      state.get().slow ? SLOW_DOCUMENT_LATENCY : DOCUMENT_LATENCY,
      signal,
    );

    if (state.get().offline) {
      throw new Error("Folio's document service is offline.");
    }
  };

  const isMember = (person: string, workspace: WorkspaceId) => {
    const memberships: Record<string, WorkspaceId[] | undefined> =
      state.get().memberships;

    return memberships[person]?.includes(workspace) === true;
  };

  return {
    state: { get: state.get, subscribe: state.subscribe },
    isMember,
    getDocuments: (workspace: WorkspaceId) =>
      state
        .get()
        .documents.filter((document) => document.workspace.id === workspace),
    loadDocument: async ({
      workspaceId,
      documentId,
      account,
      signal,
    }: {
      workspaceId: WorkspaceId;
      documentId: string;
      account: { id: string };
      signal: AbortSignal;
    }): Promise<DocumentAnswer> => {
      await answerAfterLatency(signal);

      const document = state
        .get()
        .documents.find(
          (candidate) =>
            candidate.id === documentId &&
            candidate.workspace.id === workspaceId,
        );

      if (document === undefined) {
        return { status: "missing" };
      }

      if (!isMember(account.id, workspaceId)) {
        return { status: "no-access" };
      }

      return { status: "found", document };
    },
    checkInvite: async ({
      inviteId,
      signal,
    }: {
      inviteId: string;
      signal: AbortSignal;
    }): Promise<InviteAnswer> => {
      await answerAfterLatency(signal);

      const invite = INVITES[inviteId];

      if (invite === undefined) {
        return { status: "unknown" };
      }

      return { status: "valid", ...invite };
    },
    prepareDocument: (signal: AbortSignal) => answerAfterLatency(signal),
    createDocument: ({
      account,
      workspaceId,
      template,
    }: {
      account: { id: string };
      workspaceId: WorkspaceId;
      template: DocumentTemplate;
    }) => {
      const current = state.get();

      const count = current.documents.filter((document) =>
        document.id.startsWith(`${template}-`),
      ).length;

      const document: FolioDocument = {
        id: `${template}-${count + 1}`,
        workspace: { id: workspaceId },
        ...TEMPLATES[template],
        author: { id: account.id },
        comments: [],
      };

      state.set({ ...current, documents: [...current.documents, document] });

      return document;
    },
    join: ({
      account,
      workspaceId,
    }: {
      account: { id: string };
      workspaceId: WorkspaceId;
    }) => {
      const current = state.get();
      const person = account.id;

      if (!isPersonId(person) || isMember(person, workspaceId)) {
        return;
      }

      state.set({
        ...current,
        memberships: {
          ...current.memberships,
          [person]: [...current.memberships[person], workspaceId],
        },
      });
    },
    setSlow: (slow: boolean) => {
      state.set({ ...state.get(), slow });
    },
    setOffline: (offline: boolean) => {
      state.set({ ...state.get(), offline });
    },
    reset: () => {
      state.set(getInitialState());
    },
  };
};
