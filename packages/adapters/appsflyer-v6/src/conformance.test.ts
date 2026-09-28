import { testIncomingSource } from "@priemskiyyy/junction/testing";

import { appsFlyer } from "src/appsFlyer";
import { createFakeAppsFlyer } from "src/fakeAppsFlyer.fixture";

testIncomingSource({
  name: "AppsFlyer 6",
  createFixture: () => {
    const fake = createFakeAppsFlyer();

    return {
      source: appsFlyer({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () =>
        fake.deliver({
          deepLinkStatus: "FOUND",
          isDeferred: false,
          data: { deep_link_value: "document-42" },
        }),
      miss: () =>
        fake.deliver({
          deepLinkStatus: "NOT_FOUND",
          isDeferred: false,
          data: "deep link not found",
        }),
      listeners: fake.listeners,
    };
  },
});
