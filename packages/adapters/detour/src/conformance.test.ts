import { testIncomingSource } from "@priemskiyyy/junction/testing";

import { detour } from "src/detour";
import { createFakeDetour } from "src/fakeDetour.fixture";

testIncomingSource({
  name: "detour",
  createFixture: () => {
    const fake = createFakeDetour();

    setTimeout(fake.finish, 0);

    return {
      source: detour({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () => fake.resolve("/documents/2", "verified"),
      launch: () => fake.resolve("/documents/1", "deferred"),
      listeners: fake.listeners,
    };
  },
});
