import { DEFAULT_ACTION_ID } from "example-shared/device/constants/notifications";
import type { NotificationPreset } from "example-shared/device/types/NotificationPreset";

/** Grace mentions Ada in Q3 budget: the notification is for Ada, whoever is signed in. */
export const ADA_MENTION: NotificationPreset = {
  id: "mention-ada",
  title: "Grace mentioned you in Q3 budget",
  body: "Ada, the design line is 4% over. Can we talk?",
  request: {
    identifier: "mention-design-over",
    content: {
      categoryIdentifier: "comment",
      data: {
        accountId: "ada",
        workspaceId: "finance",
        documentId: "q3-budget",
        commentId: "design-over",
      },
    },
  },
  actions: [
    { id: DEFAULT_ACTION_ID, label: "Open" },
    { id: "mark-read", label: "Mark as read" },
  ],
};

/** Ada mentions Grace in Invoice run: the notification is for Grace. */
export const GRACE_MENTION: NotificationPreset = {
  id: "mention-grace",
  title: "Ada mentioned you in Invoice run",
  body: "Grace, Northwind's invoice went out. Can you check the total?",
  request: {
    identifier: "mention-northwind-sent",
    content: {
      categoryIdentifier: "comment",
      data: {
        accountId: "grace",
        workspaceId: "finance",
        documentId: "invoice-run",
        commentId: "northwind-sent",
      },
    },
  },
  actions: [
    { id: DEFAULT_ACTION_ID, label: "Open" },
    { id: "mark-read", label: "Mark as read" },
  ],
};

/** The notifications the lab can deliver, in the order the panel shows them. */
export const NOTIFICATION_PRESETS: NotificationPreset[] = [
  ADA_MENTION,
  GRACE_MENTION,
];
