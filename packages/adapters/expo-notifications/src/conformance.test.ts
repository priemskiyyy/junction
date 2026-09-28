import { testIncomingSource } from "@priemskiyyy/junction/testing";

import { createFakeNotifications } from "src/fakeNotifications.fixture";
import { notifications } from "src/notifications";

const press = (identifier: string) => ({
  notification: {
    request: {
      identifier,
      content: { data: {}, categoryIdentifier: null },
    },
  },
  actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
});

testIncomingSource({
  name: "expo-notifications",
  createFixture: () => {
    const fake = createFakeNotifications();

    return {
      source: notifications({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () => fake.press(press("notification-2")),
      launch: () => fake.press(press("notification-1")),
      listeners: fake.listeners,
    };
  },
});
