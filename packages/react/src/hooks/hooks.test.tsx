import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { StrictMode, Suspense, use, useSyncExternalStore } from "react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { JunctionProvider } from "src/context/JunctionProvider";
import { createGate, createJunction, tick } from "src/hooks/junction.fixture";
import { useInbox } from "src/hooks/useInbox";
import { useIntent } from "src/hooks/useIntent";
import { useJunction } from "src/hooks/useJunction";
import { useSourceStatus } from "src/hooks/useSourceStatus";
import type {
  RegisteredExecution,
  RegisteredJunction,
} from "src/types/Register";

afterEach(cleanup);

const createGateway = () => {
  const { junction, links } = createJunction();

  const wrapper = ({ children }: PropsWithChildren) => (
    <JunctionProvider junction={junction}>{children}</JunctionProvider>
  );

  return { junction, links, wrapper };
};

const dispatchAnnouncement = async (
  junction: RegisteredJunction,
  announcementId = "a-1",
) => {
  await junction.dispatch("showAnnouncement", { announcementId });
  await tick();
};

const getStates = (junction: RegisteredJunction) =>
  junction.inbox.get().map((entry) => {
    if (entry.state === "interrupted") {
      return `interrupted: ${entry.error.code}`;
    }

    if (entry.state === "pending") {
      return `pending: ${entry.waiting.reason}`;
    }

    return entry.state;
  });

test.each<[string, () => unknown]>([
  ["useJunction", () => useJunction()],
  ["useIntent", () => useIntent("showAnnouncement", () => {})],
  ["useInbox", () => useInbox()],
  ["useInbox with a selector", () => useInbox((inbox) => inbox.length)],
  ["useSourceStatus", () => useSourceStatus("links")],
])(
  "%s outside a provider throws a JunctionError that names the provider",
  (_, useHook) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(useHook)).toThrow(
      expect.objectContaining({
        name: "JunctionError",
        code: "INVALID_CONFIGURATION",
        message: "Junction hooks must be used within a JunctionProvider.",
      }),
    );
  },
);

test("useJunction returns the nearest provider's Junction", () => {
  const outer = createJunction();
  const inner = createJunction();

  const wrapper = ({ children }: PropsWithChildren) => (
    <JunctionProvider junction={outer.junction}>
      <JunctionProvider junction={inner.junction}>{children}</JunctionProvider>
    </JunctionProvider>
  );

  expect(renderHook(() => useJunction(), { wrapper }).result.current).toBe(
    inner.junction,
  );
});

test("a mounted consumer handles the intent accepted before it mounted, then every later one", async () => {
  const { junction, wrapper } = createGateway();
  const handled: string[] = [];

  const Announcements = () => {
    useIntent("showAnnouncement", ({ announcementId }) => {
      handled.push(announcementId);
    });

    return null;
  };

  junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  render(<Announcements />, { wrapper });
  await act(tick);

  expect(handled).toEqual(["a-1"]);

  await act(() => dispatchAnnouncement(junction, "a-2"));

  expect(handled).toEqual(["a-1", "a-2"]);
});

test("an inline handler runs with the latest commit's props, and a render registers nothing new", async () => {
  const { junction, wrapper } = createGateway();
  const handled: string[] = [];

  const Announcements = ({ label }: { label: string }) => {
    useIntent("showAnnouncement", ({ announcementId }) => {
      handled.push(`${label}:${announcementId}`);
    });

    return null;
  };

  junction.start();

  const view = render(<Announcements label="first" />, { wrapper });
  const consumers = junction.diagnostics.get().consumers;

  view.rerender(<Announcements label="second" />);
  await act(() => dispatchAnnouncement(junction));

  expect(handled).toEqual(["second:a-1"]);
  expect(junction.diagnostics.get().consumers).toEqual(consumers);
});

test("an unready owner keeps its intent until a commit makes it ready, and a fallback never takes it", async () => {
  const { junction, wrapper } = createGateway();
  const primary = vi.fn();
  const fallback = vi.fn();

  const Owner = ({ ready }: { ready: boolean }) => {
    useIntent("showAnnouncement", primary, { ready });

    return null;
  };

  const Fallback = () => {
    useIntent("showAnnouncement", fallback, { fallback: true });

    return null;
  };

  junction.start();

  const view = render(
    <>
      <Owner ready={false} />
      <Fallback />
    </>,
    { wrapper },
  );

  await act(() => dispatchAnnouncement(junction));

  expect(getStates(junction)).toEqual(["pending: consumer-not-ready"]);

  view.rerender(
    <>
      <Owner ready />
      <Fallback />
    </>,
  );
  await act(tick);

  expect(primary.mock.calls).toHaveLength(1);
  expect(fallback).not.toHaveBeenCalled();
});

test("a ready function is read whenever Junction evaluates, so a refresh after it turns true delivers", async () => {
  const { junction, wrapper } = createGateway();
  const handler = vi.fn();
  const navigation = { ready: false };

  const Announcements = () => {
    useIntent("showAnnouncement", handler, { ready: () => navigation.ready });

    return null;
  };

  junction.start();
  render(<Announcements />, { wrapper });
  await act(() => dispatchAnnouncement(junction));

  expect(getStates(junction)).toEqual(["pending: consumer-not-ready"]);

  navigation.ready = true;
  await act(async () => {
    junction.refresh();
    await tick();
  });

  expect(handler.mock.calls).toHaveLength(1);
});

test("a matcher that closes over a prop takes the intent once a commit makes it match", async () => {
  const { junction, wrapper } = createGateway();
  const handler = vi.fn();

  const Documents = ({ workspaceId }: { workspaceId: string }) => {
    useIntent("openDocument", handler, {
      match: (payload) => payload.workspaceId === workspaceId,
    });

    return null;
  };

  junction.start();

  const view = render(<Documents workspaceId="workspace-1" />, { wrapper });

  await act(async () => {
    await junction.dispatch("openDocument", {
      workspaceId: "workspace-7",
      documentId: "document-42",
    });
    await tick();
  });

  expect(getStates(junction)).toEqual(["pending: no-consumer"]);

  view.rerender(<Documents workspaceId="workspace-7" />);
  await act(tick);

  expect(handler.mock.calls).toEqual([
    [
      { workspaceId: "workspace-7", documentId: "document-42" },
      expect.anything(),
    ],
  ]);
});

test("a commit after which the owner no longer matches interrupts its running attempt at once, and a late commit is refused", async () => {
  const { junction, wrapper } = createGateway();
  const response = createGate();
  const navigate = vi.fn();
  const executions: RegisteredExecution<"openDocument">[] = [];

  const Documents = ({ workspaceId }: { workspaceId: string }) => {
    useIntent(
      "openDocument",
      async (_payload, execution) => {
        executions.push(execution);
        await response.promise;

        return execution.commit(navigate);
      },
      { match: (payload) => payload.workspaceId === workspaceId },
    );

    return null;
  };

  junction.start();

  const view = render(<Documents workspaceId="workspace-7" />, { wrapper });

  await act(async () => {
    await junction.dispatch("openDocument", {
      workspaceId: "workspace-7",
      documentId: "document-42",
    });
    await tick();
  });

  view.rerender(<Documents workspaceId="workspace-1" />);

  expect(executions[0]?.signal.aborted).toBe(true);

  response.open();
  await act(tick);

  expect(navigate).not.toHaveBeenCalled();
  expect(getStates(junction)).toEqual(["interrupted: OWNER_UNMATCHED"]);
});

test("unmounting interrupts the running attempt, aborts its signal and leaves no consumer", async () => {
  const { junction, wrapper } = createGateway();
  const response = createGate();
  const executions: RegisteredExecution<"showAnnouncement">[] = [];

  const Announcements = () => {
    useIntent("showAnnouncement", (_payload, execution) => {
      executions.push(execution);

      return response.promise;
    });

    return null;
  };

  junction.start();

  const view = render(<Announcements />, { wrapper });

  await act(() => dispatchAnnouncement(junction));
  view.unmount();

  expect(executions[0]?.signal.aborted).toBe(true);
  expect(junction.diagnostics.get().consumers).toEqual([]);

  response.open();
  await tick();

  expect(getStates(junction)).toEqual(["interrupted: OWNER_DISPOSED"]);
});

test("in Strict Mode an intent is handled once, by the one consumer that remains", async () => {
  const { junction, wrapper } = createGateway();
  const handler = vi.fn();

  const Announcements = () => {
    useIntent("showAnnouncement", handler);

    return null;
  };

  junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  render(
    <StrictMode>
      <Announcements />
    </StrictMode>,
    { wrapper },
  );
  await act(tick);

  expect(handler.mock.calls).toHaveLength(1);
  expect(junction.diagnostics.get().consumers).toHaveLength(1);
});

test("a render that suspends before it commits registers nothing, so its handler never runs", async () => {
  const { junction, wrapper } = createGateway();
  const gate = createGate();
  const handler = vi.fn();

  const Announcements = () => {
    useIntent("showAnnouncement", handler);
    use(gate.promise);

    return null;
  };

  junction.start();
  render(
    <Suspense fallback={null}>
      <Announcements />
    </Suspense>,
    { wrapper },
  );
  await act(() => dispatchAnnouncement(junction));

  expect(handler).not.toHaveBeenCalled();
  expect(junction.diagnostics.get().consumers).toEqual([]);
  expect(getStates(junction)).toEqual(["pending: no-consumer"]);
});

test("a replaced Junction moves the consumer to it and leaves none on the previous one", async () => {
  const first = createJunction();
  const second = createJunction();
  const handled: string[] = [];

  const Announcements = () => {
    useIntent("showAnnouncement", ({ announcementId }) => {
      handled.push(announcementId);
    });

    return null;
  };

  first.junction.start();
  second.junction.start();

  const view = render(
    <JunctionProvider junction={first.junction}>
      <Announcements />
    </JunctionProvider>,
  );

  view.rerender(
    <JunctionProvider junction={second.junction}>
      <Announcements />
    </JunctionProvider>,
  );

  expect(first.junction.diagnostics.get().consumers).toEqual([]);
  expect(second.junction.diagnostics.get().consumers).toHaveLength(1);

  await act(() => dispatchAnnouncement(second.junction, "a-2"));

  expect(handled).toEqual(["a-2"]);
});

test("useInbox follows the inbox, and a selector renders again only when its selection changes", async () => {
  const { junction, wrapper } = createGateway();
  const renders = vi.fn();

  const Count = () => {
    const count = useInbox((inbox) => inbox.length);

    renders(count);

    return <p>{count}</p>;
  };

  junction.start();
  render(<Count />, { wrapper });
  await act(() => dispatchAnnouncement(junction, "a-1"));
  await act(() => dispatchAnnouncement(junction, "a-2"));

  expect(screen.getByText("2")).toBeDefined();

  await act(async () => {
    junction.subscribe("showAnnouncement", vi.fn(), { ready: false });
    await tick();
  });

  expect(getStates(junction)).toEqual([
    "pending: consumer-not-ready",
    "pending: consumer-not-ready",
  ]);
  expect(renders.mock.calls).toEqual([[0], [1], [2]]);
  expect(renderHook(() => useInbox(), { wrapper }).result.current).toBe(
    junction.inbox.get(),
  );
});

test("useSourceStatus follows the source from idle through attached to disposed", async () => {
  const { junction, wrapper } = createGateway();

  const Status = () => <p>{useSourceStatus("links").state}</p>;

  render(<Status />, { wrapper });

  expect(screen.getByText("idle")).toBeDefined();

  await act(() => junction.start());

  expect(screen.getByText("attached")).toBeDefined();

  act(() => junction.dispose());

  expect(screen.getByText("disposed")).toBeDefined();
});

test("mounting the provider and the passive hooks attaches, claims and runs nothing, and unmounting disposes nothing", async () => {
  const { junction, links, wrapper } = createGateway();

  const Probe = () => {
    useJunction();
    useInbox();
    useInbox((inbox) => inbox.length);
    useSourceStatus("links");

    return null;
  };

  const view = render(<Probe />, { wrapper });

  await act(tick);
  view.unmount();

  expect(links.control.attachments).toEqual([]);
  expect(junction.diagnostics.get()).toMatchObject({
    state: "idle",
    consumers: [],
  });
});

test("a panel that renders the diagnostics around a consumer settles instead of rendering forever", async () => {
  const { junction, wrapper } = createGateway();
  const renders = vi.fn();

  const Panel = ({ children }: PropsWithChildren) => {
    const current = useJunction();

    const snapshot = useSyncExternalStore(
      current.diagnostics.subscribe,
      current.diagnostics.get,
    );

    renders();

    return (
      <>
        <p>{`${snapshot.consumers.length} consumers`}</p>
        {children}
      </>
    );
  };

  const Announcements = () => {
    useIntent("showAnnouncement", () => {});

    return null;
  };

  junction.start();
  render(
    <Panel>
      <Announcements />
    </Panel>,
    { wrapper },
  );
  await act(tick);
  await act(tick);

  expect(screen.getByText("1 consumers")).toBeDefined();

  const settled = renders.mock.calls.length;

  await act(tick);
  await act(tick);

  expect(renders.mock.calls.length).toBe(settled);
});
