import { testIncomingSource } from "@priemskiyyy/junction/testing";

import { branch } from "src/branch";
import { createFakeBranch } from "src/fakeBranch.fixture";

testIncomingSource({
  name: "Branch",
  createFixture: () => {
    const fake = createFakeBranch();

    return {
      source: branch({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () =>
        fake.open({
          params: { "+clicked_branch_link": true, documentId: "document-42" },
          error: null,
          uri: "https://example.app.link/abc",
        }),
      miss: () =>
        fake.open({
          params: { "+clicked_branch_link": false },
          error: null,
          uri: "myapp://documents/42",
        }),
      listeners: fake.subscribers,
    };
  },
});
