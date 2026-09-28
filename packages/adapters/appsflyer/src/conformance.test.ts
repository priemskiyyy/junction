import { testIncomingSource } from "@priemskiyyy/junction/testing";

import { appsFlyer } from "src/appsFlyer";
import { createFakeAppsFlyer } from "src/fakeAppsFlyer.fixture";

testIncomingSource({
  name: "AppsFlyer 7",
  createFixture: () => {
    const fake = createFakeAppsFlyer();

    return {
      source: appsFlyer({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () =>
        fake.deliver({
          status: "FOUND",
          deepLink: { deep_link_value: "document-42" },
        }),
      miss: () => fake.deliver({ status: "NOT_FOUND" }),
      listeners: fake.listeners,
    };
  },
});
