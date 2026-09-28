import type { IncomingSource } from "src/types/IncomingSource";
import type { SourceSink } from "src/types/SourceSink";
import { testIncomingSource } from "src/testing/testIncomingSource";

type FakeScanner = {
  listeners: Set<(code: string) => void>;
  launch: string | null;
  scan: (code: string) => void;
  blur: () => void;
};

const createFakeScanner = (): FakeScanner => {
  const listeners = new Set<(code: string) => void>();

  return {
    listeners,
    launch: null,
    scan: (code) => {
      for (const listener of listeners) {
        listener(code);
      }
    },
    blur: () => {
      for (const listener of listeners) {
        listener("");
      }
    },
  };
};

// A source written from the public types alone, as an application's QR scanner would be.
const scanner = (
  sdk: FakeScanner,
): IncomingSource<{ code: string }, FakeScanner> => ({
  name: "qr-scanner",
  native: sdk,
  resource: null,
  attach: (sink: SourceSink<{ code: string }>) => {
    const listener = (code: string) => {
      if (code === "") {
        return;
      }

      sink.push({ input: { code } });
    };

    sdk.listeners.add(listener);

    return {
      initial: () => {
        if (sdk.launch === null) {
          return null;
        }

        return { input: { code: sdk.launch } };
      },
      dispose: () => {
        sdk.listeners.delete(listener);
      },
    };
  },
});

testIncomingSource({
  name: "a hand-written scanner",
  createFixture: () => {
    const sdk = createFakeScanner();

    return {
      source: scanner(sdk),
      native: sdk,
      open: () => sdk.scan("ticket-7"),
      launch: () => {
        sdk.launch = "ticket-1";
      },
      miss: () => sdk.blur(),
      listeners: () => sdk.listeners.size,
    };
  },
});
