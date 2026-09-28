import { testInboxStorage } from "@priemskiyyy/junction/testing";

import {
  createFakeSiloBackend,
  createFakeSiloValue,
} from "src/fakeSiloValue.fixture";
import { silo } from "src/silo";

testInboxStorage({
  name: "Silo",
  createFixture: () => {
    const backend = createFakeSiloBackend();

    return {
      storage: silo({ value: createFakeSiloValue({ backend }).value }),
      reopen: () => silo({ value: createFakeSiloValue({ backend }).value }),
    };
  },
});
