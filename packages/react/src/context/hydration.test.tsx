import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { JunctionProvider } from "src/context/JunctionProvider";
import { createJunction, tick } from "src/hooks/junction.fixture";
import { useInbox } from "src/hooks/useInbox";
import { useIntent } from "src/hooks/useIntent";

test("the client hydrates from the server's empty inbox without a mismatch, then shows the inbox and delivers", async () => {
  const { junction } = createJunction();
  const errors = vi.spyOn(console, "error");
  const onRecoverableError = vi.fn();
  const handler = vi.fn();

  const Count = () => <span>{useInbox((inbox) => inbox.length)}</span>;

  const Announcements = () => {
    useIntent("showAnnouncement", handler, { ready: false });

    return null;
  };

  const view = (
    <JunctionProvider junction={junction}>
      <Count />
      <Announcements />
    </JunctionProvider>
  );

  const html = renderToString(view);

  junction.start();
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });

  const container = document.createElement("div");

  container.innerHTML = html;
  document.body.append(container);

  let root: ReturnType<typeof hydrateRoot> | null = null;

  await act(async () => {
    root = hydrateRoot(container, view, { onRecoverableError });
    await tick();
  });

  expect(container.innerHTML).toBe("<span>1</span>");
  expect(handler).not.toHaveBeenCalled();
  expect(junction.diagnostics.get().consumers).toHaveLength(1);
  expect(onRecoverableError.mock.calls).toEqual([]);
  expect(errors.mock.calls).toEqual([]);

  act(() => root?.unmount());
  container.remove();
});
