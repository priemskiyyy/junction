import { createMockStorage } from "src/mock/createMockStorage";
import { testInboxStorage } from "src/testing/testInboxStorage";

testInboxStorage({
  name: "mock",
  createFixture: () => {
    const first = createMockStorage();

    return {
      storage: first.storage,
      reopen: () =>
        createMockStorage({ stored: first.control.stored() }).storage,
    };
  },
});
