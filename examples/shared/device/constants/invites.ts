import type { InviteLink } from "example-shared/device/types/InviteLink";

/** Ada's invite to Design, sent through an Adjust link. */
export const INVITE_LINK: InviteLink = {
  id: "design-7f3",
  from: { id: "ada" },
  workspace: { id: "design" },
  deeplink: "folio://invites/design-7f3?workspace=design",
};
