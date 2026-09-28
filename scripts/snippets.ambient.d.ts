// Names a documentation example may use without declaring them. They stand
// for the reader's own application and for keys a reader brings.
import type {
  IncomingSource,
  InboxStorage,
  IntentDefinition,
  Junction,
  JunctionIdentity,
  ObservableValue,
} from "@priemskiyyy/junction";
import type { LinkingInput } from "@priemskiyyy/junction-react-native";
import type { ReactNode } from "react";

type OpenDocument = {
  workspaceId: string;
  documentId: string;
};

type ShowAnnouncement = { announcementId: string };

declare global {
  /** The intents most examples declare or extend. */
  const intents: {
    openDocument: IntentDefinition<OpenDocument, OpenDocument, true>;
    showAnnouncement: IntentDefinition<
      ShowAnnouncement,
      ShowAnnouncement,
      false
    >;
  };
  /** The application's Junction, over a Linking source named `links`. */
  const junction: Junction<
    typeof intents,
    { links: IncomingSource<LinkingInput, unknown> }
  >;
  /** The application's own identity store. */
  const identity: ObservableValue<JunctionIdentity>;
  /** The application's own storage for persistent intents. */
  const storage: InboxStorage;
  /** The application's own API client. */
  const api: {
    checkAccess: (options: {
      documentId: string;
      account: string;
      signal: AbortSignal;
    }) => Promise<{ allowed: boolean }>;
  };
  /** The application's own navigation. */
  const navigation: {
    openDocument: (documentId: string) => void;
    navigate: (screen: string, params?: object) => void;
    isReady: () => boolean;
  };
  const useNavigation: () => typeof navigation;
  const currentWorkspaceId: string;
  const workspaceStore: { subscribe: (listener: () => void) => () => void };
  const Application: () => ReactNode;
  const announcements: { open: (announcementId: string) => void };
  /** Provider keys, which a reader brings and an example never carries. */
  const devKey: string;
  const appId: string;
  const appToken: string;
  const appID: string;
  const apiKey: string;
  const Navigation: () => ReactNode;
}
