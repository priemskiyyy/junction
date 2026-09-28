import type { JsonObject } from "@priemskiyyy/junction";

/** A notification the lab can deliver to the device, with the actions its category offers. */
export type NotificationPreset = {
  id: string;
  title: string;
  body: string;
  request: {
    identifier: string;
    content: { categoryIdentifier: string; data: JsonObject };
  };
  actions: { id: string; label: string }[];
};
