import { Junction } from "@priemskiyyy/junction";
import type {
  InboxStorage,
  JunctionIdentity,
  ObservableValue,
} from "@priemskiyyy/junction";
import { adjust } from "@priemskiyyy/junction-adjust";
import { notifications } from "@priemskiyyy/junction-expo-notifications";
import { quickActions } from "@priemskiyyy/junction-expo-quick-actions";
import { linking } from "@priemskiyyy/junction-react-native";

import { DEFAULT_ACTION_ID } from "example-shared/device/constants/notifications";
import { NEW_DOCUMENT_SHORTCUTS } from "example-shared/junction/constants/shortcuts";
import { FOLIO_INTENTS } from "example-shared/junction/folioIntents";
import type { FolioSdks } from "example-shared/junction/types/FolioSdks";

/** Folio's Junction: four sources over the SDKs it is given, the routes from each to an intent, the signed-in identity and the storage. */
export const createFolioJunction = ({
  sdks,
  identity,
  storage,
  now,
}: {
  sdks: FolioSdks;
  identity: ObservableValue<JunctionIdentity>;
  storage: InboxStorage;
  now: () => number;
}) =>
  new Junction({
    intents: FOLIO_INTENTS,
    sources: {
      links: linking({ sdk: sdks.linking }),
      notifications: notifications({
        sdk: sdks.notifications,
        interaction: "per-notification-action",
      }),
      shortcuts: quickActions({ sdk: sdks.quickActions }),
      installs: adjust({ sdk: sdks.adjust }),
    },
    routes: ({ from }) => ({
      documentLink: from.links.url({
        url: "https://folio.example/workspaces/:workspaceId/documents/:documentId",
        intent: "openDocument",
        payload: ({ params }) => ({
          workspaceId: params.workspaceId,
          documentId: params.documentId,
        }),
      }),
      documentScheme: from.links.url({
        url: "folio://open/:workspaceId/:documentId",
        intent: "openDocument",
        payload: ({ params }) => ({
          workspaceId: params.workspaceId,
          documentId: params.documentId,
        }),
      }),
      mention: from.notifications.event({
        intent: "openComment",
        match: ({ action }) => action.id === DEFAULT_ACTION_ID,
        payload: ({ data }) => ({
          accountId: data.accountId,
          workspaceId: data.workspaceId,
          documentId: data.documentId,
          commentId: data.commentId,
        }),
      }),
      newDocument: from.shortcuts.event({
        intent: "newDocument",
        match: ({ action }) => NEW_DOCUMENT_SHORTCUTS.includes(action.id),
        payload: ({ action }) => ({ template: action.params.template }),
      }),
      invite: from.installs.url({
        url: "folio://invites/:inviteId",
        intent: "joinWorkspace",
        payload: ({ params, query }) => ({
          inviteId: params.inviteId,
          workspaceId: query.single("workspace"),
        }),
      }),
    }),
    identity,
    storage,
    now,
  });
