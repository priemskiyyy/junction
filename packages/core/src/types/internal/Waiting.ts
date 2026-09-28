import type { InboxEntry } from "src/types/InboxEntry";

export type Waiting = Extract<
  InboxEntry<string, unknown>,
  { state: "pending" }
>["waiting"];
