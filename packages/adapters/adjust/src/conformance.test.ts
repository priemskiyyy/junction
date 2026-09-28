import { testIncomingSource } from "@priemskiyyy/junction/testing";

import { adjust } from "src/adjust";
import { createFakeAdjust } from "src/fakeAdjust.fixture";

testIncomingSource({
  name: "adjust",
  createFixture: () => {
    const fake = createFakeAdjust();

    return {
      source: adjust({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () => {
        fake.initSdk();
        fake.attribute("myapp://documents/1");
      },
      miss: () => {
        fake.initSdk();
        fake.attributeWithoutLink();
      },
      listeners: fake.listeners,
      detaches: false,
    };
  },
});
