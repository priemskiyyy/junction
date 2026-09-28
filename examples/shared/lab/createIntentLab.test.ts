import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { BRAND_BRIEF_MESSAGE } from "example-shared/device/constants/messages";
import { createOpenDocumentHandler } from "example-shared/folio/handlers/createOpenDocumentHandler";
import { createIntentLab } from "example-shared/lab/createIntentLab";
import type { IntentLab } from "example-shared/lab/types/IntentLab";

const labs: IntentLab[] = [];

beforeEach(() => {
  // Junction reads the lab's clock, so Date moves with the timers or a retry is never due.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});

afterEach(() => {
  for (const lab of labs.splice(0)) {
    lab.dispose();
  }

  vi.useRealTimers();
});

const createLab = async () => {
  const lab = createIntentLab();

  labs.push(lab);
  await vi.advanceTimersByTimeAsync(1_000);
  await lab.started;

  return lab;
};

const registerShell = (lab: IntentLab) => {
  const { junction, app } = lab.runtime.get();

  return junction.subscribe(
    "openDocument",
    createOpenDocumentHandler({ world: lab.world, app }),
    { fallback: true, name: "Folio shell" },
  );
};

test("a link that launches Folio waits for sign-in, then opens for whoever signs in", async () => {
  const lab = await createLab();

  lab.quit();

  const launched = lab.openLink(BRAND_BRIEF_MESSAGE.url);

  registerShell(lab);
  await vi.advanceTimersByTimeAsync(1_000);
  await launched;

  const { junction, app } = lab.runtime.get();

  expect(junction.inbox.get()).toMatchObject([
    {
      name: "openDocument",
      payload: { workspaceId: "design", documentId: "brand-brief" },
      state: "pending",
      waiting: { reason: "authentication" },
      provenance: { kind: "source", source: { name: "links" }, initial: true },
    },
  ]);

  app.signIn("ada");
  await vi.advanceTimersByTimeAsync(1_000);

  expect(junction.inbox.get()).toEqual([]);
  expect(app.navigation.get().panes).toMatchObject([
    { workspace: { id: "design" }, document: { id: "brand-brief" } },
  ]);
  expect(
    lab.intents.get()[Object.keys(lab.intents.get())[0] ?? ""],
  ).toMatchObject({
    label: "Open Brand brief",
  });
});
