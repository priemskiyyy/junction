import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createIntentLab } from "example-shared/lab/createIntentLab";
import type { IntentLab } from "example-shared/lab/types/IntentLab";
import { Application } from "src/Application";

class IntersectionObserverStub {
  observe() {}

  disconnect() {}
}

const labs: IntentLab[] = [];

beforeEach(() => {
  // Junction reads the lab's clock, so Date moves with the timers or a retry is never due.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

afterEach(() => {
  cleanup();

  for (const lab of labs.splice(0)) {
    lab.dispose();
  }

  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Resolves once every promise callback queued so far has run.
const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const advance = async (duration: number) => {
  await act(async () => {
    await flushPromises();
    await vi.advanceTimersByTimeAsync(duration);
    await flushPromises();
  });
};

const renderLab = async () => {
  const lab = createIntentLab();

  labs.push(lab);
  render(<Application lab={lab} />);
  await advance(1_000);

  return lab;
};

type Scope = Pick<ReturnType<typeof within>, "getByRole">;

const press = async (name: string | RegExp, scope: Scope = screen) => {
  await act(async () => {
    fireEvent.click(scope.getByRole("button", { name }));
  });
  await advance(0);
};

const toggle = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("switch", { name }));
  });
  await advance(0);
};

const getPhone = () =>
  within(screen.getByRole("region", { name: "The phone" }));

const getLatest = () =>
  within(screen.getByRole("region", { name: "Latest intent" }));

const getInbox = () =>
  within(screen.getByRole("region", { name: "Junction's inbox" }));

const getAnswer = () =>
  getLatest().getByRole("status", { name: "Latest answer" }).textContent;

const getLatestState = () =>
  getLatest().getByRole("status", { name: "Its state" }).textContent;

const signIn = async (person: "Ada" | "Grace") => {
  await press(new RegExp(`^Continue as ${person}`), getPhone());
  await advance(0);
};

const switchTo = async (person: "Ada" | "Grace") => {
  await press(/^Signed in as/, getPhone());
  await press(`Switch to ${person}`, getPhone());
};

const tapLink = (text: string) => press(`Open the link to ${text}`);

test("the lab opens on Folio's sign-in screen, with nothing arrived yet", async () => {
  await renderLab();

  expect(
    getPhone().getByRole("heading", { name: "Sign in to Folio" }),
  ).toBeTruthy();
  expect(getLatest().getByText("Nothing has arrived yet")).toBeTruthy();
  expect(getInbox().getByText("The inbox is empty")).toBeTruthy();
});

test("a link that launches Folio waits for someone to sign in, then opens for whoever does", async () => {
  await renderLab();

  await press("Swipe Folio away to quit it");
  await tapLink("The brief for Monday's review");
  await advance(1_000);

  expect(getAnswer()).toContain("Accepted from Links");
  expect(getLatest().getByText("launch read")).toBeTruthy();
  expect(
    getLatest().getByText(
      "It is for whoever signs in, and nobody is signed in.",
    ),
  ).toBeTruthy();

  await signIn("Ada");
  await advance(1_000);

  expect(getPhone().getByRole("article", { name: "Brand brief" })).toBeTruthy();
  expect(getLatestState()).toBe("Handled");
  expect(getLatest().getByText("for Ada")).toBeTruthy();
});

test("two panes on one workspace both claim a link, so it waits until one of them shows another workspace", async () => {
  await renderLab();
  await signIn("Ada");

  await press("Split view", getPhone());
  await tapLink("Launch plan, with the new dates");
  await advance(1_000);

  expect(
    getInbox().getByText(
      "Top pane · Design and Bottom pane · Design both claim it, so Junction waits instead of choosing by mount order.",
    ),
  ).toBeTruthy();

  await act(async () => {
    fireEvent.click(
      within(
        getPhone().getByRole("tablist", {
          name: "Bottom pane · Design: workspaces",
        }),
      ).getByRole("tab", { name: "Finance" }),
    );
  });
  await advance(1_000);

  expect(
    within(
      getPhone().getByRole("region", { name: "Top pane · Design" }),
    ).getByRole("article", { name: "Launch plan" }),
  ).toBeTruthy();
  expect(getInbox().getByText("The inbox is empty")).toBeTruthy();
});

test("a pane with unsaved changes holds the link it owns, and no other screen takes it meanwhile", async () => {
  await renderLab();
  await signIn("Ada");

  await press(/^Brand brief/, getPhone());
  await press("Edit", getPhone());
  await tapLink("Launch plan, with the new dates");
  await advance(1_000);

  expect(
    getInbox().getByText(
      "Workspace screen · Design owns it but is not ready, and no other screen gets it meanwhile.",
    ),
  ).toBeTruthy();
  expect(getPhone().getByRole("article", { name: "Brand brief" })).toBeTruthy();

  await press("Save", getPhone());
  await advance(1_000);

  expect(getPhone().getByRole("article", { name: "Launch plan" })).toBeTruthy();
});

test("a link for a workspace no pane shows goes to Folio's shell, which opens that workspace", async () => {
  await renderLab();
  await signIn("Ada");

  await tapLink("Q3 numbers are in");
  await advance(1_000);

  expect(getPhone().getByRole("article", { name: "Q3 budget" })).toBeTruthy();
  expect(
    getPhone().getByRole("region", { name: "Workspace screen · Finance" }),
  ).toBeTruthy();
});

test("a person outside the workspace is refused by the handler, which rejects the intent", async () => {
  await renderLab();
  await signIn("Grace");

  await tapLink("The brief for Monday's review");
  await advance(1_000);

  expect(getLatestState()).toBe("Rejected");
  expect(
    getLatest().getByText(
      "Its handler rejected it: Grace is not a member of Design",
    ),
  ).toBeTruthy();
});

test("switching accounts under a running attempt interrupts it, and a retry runs it for its own account only", async () => {
  await renderLab();
  await signIn("Ada");
  await toggle("Slow documents");

  await tapLink("The brief for Monday's review");
  await advance(1_000);
  await switchTo("Grace");

  expect(getInbox().getByText("Interrupted")).toBeTruthy();
  expect(getPhone().queryByRole("article", { name: "Brand brief" })).toBeNull();

  await press("Retry Open Brand brief", getInbox());
  await advance(1_000);

  expect(
    getInbox().getByText("It is for Ada, and someone else is signed in."),
  ).toBeTruthy();

  await switchTo("Ada");
  await advance(4_000);

  expect(getPhone().getByRole("article", { name: "Brand brief" })).toBeTruthy();
});

test("a mention for Ada waits while Grace is signed in, and opens on the comment once Ada is", async () => {
  await renderLab();
  await signIn("Grace");

  await press("Open: Grace mentioned you in Q3 budget");
  await advance(1_000);

  expect(
    getInbox().getByText("It is for Ada, and someone else is signed in."),
  ).toBeTruthy();

  await switchTo("Ada");
  await advance(1_000);

  expect(getPhone().getByRole("article", { name: "Q3 budget" })).toBeTruthy();
  expect(getPhone().getByText("from the mention")).toBeTruthy();
});

test("an action no route takes is ignored, and nothing is admitted", async () => {
  await renderLab();

  await press("Mark as read: Grace mentioned you in Q3 budget");
  await advance(0);

  expect(getAnswer()).toContain(
    "Notifications: no route takes it, so nothing was admitted",
  );
  expect(getInbox().getByText("The inbox is empty")).toBeTruthy();
});

test("a shortcut before sign-in waits, then creates the document in the workspace of whoever signs in", async () => {
  await renderLab();

  await press("Shortcut: New document");
  await advance(0);

  expect(
    getInbox().getByText(
      "It is for whoever signs in, and nobody is signed in.",
    ),
  ).toBeTruthy();

  await signIn("Grace");
  await advance(1_000);

  expect(
    getPhone().getByRole("article", { name: "Untitled document" }),
  ).toBeTruthy();
  expect(
    getPhone().getByText("Created Untitled document in Finance"),
  ).toBeTruthy();
});

test("an invite install hands over a deferred link, which joins whoever signs in to its workspace", async () => {
  await renderLab();

  await press("Install Folio from the invite");
  await advance(2_000);

  expect(getLatest().getByText("deferred")).toBeTruthy();
  expect(getLatest().getByText("Join Design")).toBeTruthy();

  await signIn("Grace");
  await advance(1_000);

  expect(
    getPhone().getByText("Grace joined Design, invited by Ada"),
  ).toBeTruthy();
  expect(
    within(
      getPhone().getByRole("tablist", {
        name: "Workspace screen · Design: workspaces",
      }),
    ).getAllByRole("tab"),
  ).toHaveLength(2);
});

test("the inspector says a lookalike host has no route, and admits nothing", async () => {
  await renderLab();

  await press("A lookalike host");

  const inspector = within(
    screen.getByRole("region", { name: "Ask Junction about a link" }),
  );

  expect(inspector.getByText("Ignored")).toBeTruthy();
  expect(inspector.getByText("no route takes it")).toBeTruthy();
  expect(getInbox().getByText("The inbox is empty")).toBeTruthy();
});

test("the inspector shows the schema's issue for an id with a space, which the route matched", async () => {
  await renderLab();

  await press("An id with a space");

  const inspector = within(
    screen.getByRole("region", { name: "Ask Junction about a link" }),
  );

  expect(inspector.getByText("Refused")).toBeTruthy();
  expect(
    inspector.getByText("Use lowercase words joined by hyphens."),
  ).toBeTruthy();
});

test("two taps on one link are two intents", async () => {
  await renderLab();

  await press("Tap Brand brief twice");
  await advance(0);

  const result = within(
    within(
      screen.getByRole("region", { name: "One link, tapped twice" }),
    ).getByRole("status", { name: "Result" }),
  );

  expect(result.getByText("handed over").previousSibling?.textContent).toBe(
    "2",
  );
  expect(result.getByText("intents").previousSibling?.textContent).toBe("2");
  expect(result.getByText("duplicates").previousSibling?.textContent).toBe("0");
});

test("one press the platform hands over twice is one intent and one duplicate", async () => {
  await renderLab();

  await press("Launch from a press delivered twice");
  await advance(1_000);

  const result = within(
    within(
      screen.getByRole("region", { name: "One press, delivered twice" }),
    ).getByRole("status", { name: "Result" }),
  );

  expect(result.getByText("handed over").previousSibling?.textContent).toBe(
    "2",
  );
  expect(result.getByText("intents").previousSibling?.textContent).toBe("1");
  expect(result.getByText("duplicates").previousSibling?.textContent).toBe("1");
});

test("while the document service is down the handler asks to retry, and the attempt after it is back opens the document", async () => {
  await renderLab();
  await signIn("Ada");
  await toggle("Documents offline");

  await tapLink("The brief for Monday's review");
  await advance(1_000);

  expect(getInbox().getByText(/^Retry in 0:0\d$/)).toBeTruthy();

  await toggle("Documents offline");
  await advance(3_000);

  expect(getPhone().getByRole("article", { name: "Brand brief" })).toBeTruthy();
});

test("an intent that used every attempt fails, and only Cancel is offered", async () => {
  await renderLab();
  await signIn("Ada");
  await toggle("Documents offline");

  await tapLink("The brief for Monday's review");
  await advance(10_000);

  expect(getInbox().getByText("Failed")).toBeTruthy();
  expect(
    getInbox().getByText(
      "It failed, since every attempt was used. Cancel it, and open it again once the cause is fixed.",
    ),
  ).toBeTruthy();
  expect(getInbox().queryByRole("button", { name: /^Retry/ })).toBeNull();

  await press("Cancel Open Brand brief", getInbox());
  await advance(0);

  expect(getInbox().getByText("The inbox is empty")).toBeTruthy();
});

test("a failed storage write holds a persistent intent until a write succeeds", async () => {
  await renderLab();
  await signIn("Ada");
  await toggle("Storage writes fail");

  await tapLink("The brief for Monday's review");
  await advance(1_000);

  expect(
    getInbox().getByText(
      "Storage has not confirmed a write, and it will not run on a lease that may not be saved.",
    ),
  ).toBeTruthy();

  await toggle("Storage writes fail");
  await press("Write again");
  await advance(1_000);

  expect(getPhone().getByRole("article", { name: "Brand brief" })).toBeTruthy();
});

test("a restart brings back the intents that persist and forgets the others", async () => {
  await renderLab();

  await tapLink("The brief for Monday's review");
  await press("Open: Grace mentioned you in Q3 budget");
  await advance(500);
  await press("Restart Folio");
  await advance(1_000);

  expect(
    screen.getByText(
      "Folio's inbox held 2 intents, and 1 intent came back from storage. A mention or a new document lives in memory, and a restart forgets it.",
    ),
  ).toBeTruthy();
  expect(getInbox().getAllByRole("listitem")).toHaveLength(1);
  expect(
    getInbox().getByRole("listitem", { name: "Open Brand brief" }),
  ).toBeTruthy();
});

test("an intent that was running when Folio restarted comes back interrupted", async () => {
  await renderLab();
  await signIn("Ada");
  await toggle("Slow documents");

  await tapLink("The brief for Monday's review");
  await advance(1_000);
  await press("Restart Folio");
  await advance(1_000);

  expect(getInbox().getByText("Interrupted")).toBeTruthy();
  expect(
    getInbox().getByText(
      "It was interrupted, since Folio restarted while it ran. Its effect may have happened, so retrying is Folio's call.",
    ),
  ).toBeTruthy();
});

test("a corrupt saved inbox blocks storage and refuses persistent intents until storage is reset", async () => {
  await renderLab();

  await press("Corrupt the saved inbox");
  await advance(1_000);

  expect(
    screen.getAllByText("Blocked: the saved inbox is corrupt").length,
  ).toBeGreaterThan(0);

  await tapLink("The brief for Monday's review");
  await advance(0);

  expect(getAnswer()).toContain(
    "Links: refused, since storage is blocked, and the intent persists",
  );

  await press("Reset storage");
  await advance(1_000);
  await tapLink("The brief for Monday's review");
  await advance(1_000);

  expect(getAnswer()).toContain("Accepted from Links");
});

test("skipping past the deadline expires the intents that wait", async () => {
  await renderLab();

  await tapLink("The brief for Monday's review");
  await advance(500);
  await press("Skip ahead 11 minutes");
  await advance(0);

  expect(
    screen.getByText(
      "1 intent expired. An intent waits ten minutes at most, and past its deadline it never runs.",
    ),
  ).toBeTruthy();
  expect(getInbox().getByText("The inbox is empty")).toBeTruthy();
});
