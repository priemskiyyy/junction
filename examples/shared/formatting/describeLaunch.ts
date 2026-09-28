import { match } from "ts-pattern";

import type { LaunchVia } from "example-shared/device/types/LaunchVia";

/** How Folio started, as the timeline says it. */
export const describeLaunch = (via: LaunchVia) =>
  match(via)
    .with({ kind: "icon" }, () => "Folio launched from its icon")
    .with({ kind: "link" }, ({ url }) => `Folio launched from a link: ${url}`)
    .with(
      { kind: "notification" },
      ({ response }) =>
        `Folio launched from a notification: ${response.notification.request.identifier}`,
    )
    .with(
      { kind: "shortcut" },
      ({ action }) => `Folio launched from the ${action.id} shortcut`,
    )
    .exhaustive();
