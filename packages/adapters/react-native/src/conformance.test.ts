import { testIncomingSource } from "@priemskiyyy/junction/testing";

import { createFakeExpoLinking } from "src/fakeExpoLinking.fixture";
import { createFakeLinking } from "src/fakeLinking.fixture";
import { linking } from "src/linking";

testIncomingSource({
  name: "React Native Linking",
  createFixture: () => {
    const fake = createFakeLinking();

    return {
      source: linking({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () => fake.open("myapp://documents/document-42"),
      launch: () => fake.launch("myapp://documents/document-7"),
      listeners: fake.listeners,
    };
  },
});

testIncomingSource({
  name: "expo-linking",
  createFixture: () => {
    const fake = createFakeExpoLinking();

    return {
      source: linking({ sdk: fake.sdk }),
      native: fake.sdk,
      open: () => fake.open("myapp://documents/document-42"),
      launch: () => fake.launch("myapp://documents/document-7"),
      listeners: fake.listeners,
    };
  },
});
