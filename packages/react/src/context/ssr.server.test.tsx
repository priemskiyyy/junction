import type { SourceStatus } from "@priemskiyyy/junction";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { JunctionProvider } from "src/context/JunctionProvider";
import { createJunction, tick } from "src/hooks/junction.fixture";
import { useInbox } from "src/hooks/useInbox";
import { useIntent } from "src/hooks/useIntent";
import { useSourceStatus } from "src/hooks/useSourceStatus";
import type {
  RegisteredInboxEntry,
  RegisteredJunction,
} from "src/types/Register";

test("a server render reads an empty inbox and an idle source, and registers and runs nothing, whatever the Junction holds, with no window", async () => {
  const { junction } = createJunction();
  const handler = vi.fn();

  const Probe = () => {
    const count = useInbox((inbox) => inbox.length);
    const status = useSourceStatus("links");

    useIntent("showAnnouncement", handler);

    return <span>{`${count}:${status.state}`}</span>;
  };

  await junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });

  const html = renderToString(
    <JunctionProvider junction={junction}>
      <Probe />
    </JunctionProvider>,
  );

  await tick();

  expect(typeof window).toBe("undefined");
  expect(html).toBe("<span>0:idle</span>");
  expect(handler).not.toHaveBeenCalled();
  expect(junction.diagnostics.get().consumers).toEqual([]);
});

test("the server snapshots are frozen and interned, whatever the Junction holds when the server renders", async () => {
  const { junction } = createJunction();

  const record =
    vi.fn<(inbox: RegisteredInboxEntry[], status: SourceStatus) => void>();

  const Probe = () => {
    record(useInbox(), useSourceStatus("links"));

    return null;
  };

  const renderOnServer = (current: RegisteredJunction) =>
    renderToString(
      <JunctionProvider junction={current}>
        <Probe />
      </JunctionProvider>,
    );

  renderOnServer(junction);
  await junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  renderOnServer(junction);

  const [first, second] = record.mock.calls;

  expect(record.mock.calls).toEqual([
    [[], { state: "idle" }],
    [[], { state: "idle" }],
  ]);
  expect(second?.[0]).toBe(first?.[0]);
  expect(second?.[1]).toBe(first?.[1]);
  expect(Object.isFrozen(first?.[0])).toBe(true);
  expect(Object.isFrozen(first?.[1])).toBe(true);
});
