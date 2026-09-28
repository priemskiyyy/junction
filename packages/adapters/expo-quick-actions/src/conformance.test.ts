import { testIncomingSource } from "@priemskiyyy/junction/testing";

import { createFakeQuickActions } from "src/fakeQuickActions.fixture";
import { quickActions } from "src/quickActions";

testIncomingSource({
  name: "expo-quick-actions",
  createFixture: () => {
    const fake = createFakeQuickActions();

    return {
      source: quickActions({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () => fake.perform({ id: "search", params: null }),
      launch: () => fake.launch({ id: "compose", params: {} }),
      listeners: fake.listeners,
    };
  },
});
