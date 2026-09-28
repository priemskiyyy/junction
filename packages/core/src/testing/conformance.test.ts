import { createMockSource } from "src/mock/createMockSource";
import { testIncomingSource } from "src/testing/testIncomingSource";

testIncomingSource({
  name: "mock",
  createFixture: () => {
    const native = { kind: "mock-sdk" };

    const { source, control } = createMockSource<
      { url: string },
      typeof native
    >({ native });

    return {
      source,
      native,
      open: async () => {
        await control.emit({ input: { url: "myapp://open" } });
      },
      listeners: control.listeners,
    };
  },
});
