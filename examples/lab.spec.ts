import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const WIDTHS = [375, 1280];

const open = async (page: Page, width: number) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  await expect(
    page
      .getByRole("region", { name: "The phone" })
      .getByRole("heading", { name: "Sign in to Folio" }),
  ).toBeVisible();

  return errors;
};

const hasHorizontalScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

for (const width of WIDTHS) {
  test(`a link opens Folio cold, waits for sign-in and opens for Ada, with no page errors or horizontal scroll at ${width}px`, async ({
    page,
  }, testInfo) => {
    const errors = await open(page, width);
    const phone = page.getByRole("region", { name: "The phone" });
    const latest = page.getByRole("region", { name: "Latest intent" });

    await expect(hasHorizontalScroll(page)).resolves.toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`lab-start-${width}.png`),
      fullPage: true,
    });

    await page
      .getByRole("button", { name: "Swipe Folio away to quit it" })
      .click();
    await page
      .getByRole("button", {
        name: "Open the link to The brief for Monday's review",
      })
      .click();
    await expect(
      latest.getByText("It is for whoever signs in, and nobody is signed in."),
    ).toBeVisible();

    await phone.getByRole("button", { name: /^Continue as Ada/ }).click();
    await expect(
      phone.getByRole("article", { name: "Brand brief" }),
    ).toBeVisible();
    await expect(latest.getByRole("status", { name: "Its state" })).toHaveText(
      "Handled",
    );
    await expect(hasHorizontalScroll(page)).resolves.toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`lab-opened-${width}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("two panes that both claim a link hold it, and the pane that alone matches takes it", async ({
  page,
}) => {
  await open(page, 1280);

  const phone = page.getByRole("region", { name: "The phone" });
  const inbox = page.getByRole("region", { name: "Junction's inbox" });

  await phone.getByRole("button", { name: /^Continue as Ada/ }).click();
  await phone.getByRole("button", { name: "Split view" }).click();
  await page
    .getByRole("button", {
      name: "Open the link to Launch plan, with the new dates",
    })
    .click();
  await expect(
    inbox.getByText(
      "Top pane · Design and Bottom pane · Design both claim it, so Junction waits instead of choosing by mount order.",
    ),
  ).toBeVisible();

  await phone
    .getByRole("tablist", { name: "Bottom pane · Design: workspaces" })
    .getByRole("tab", { name: "Finance" })
    .click();
  await expect(
    phone
      .getByRole("region", { name: "Top pane · Design" })
      .getByRole("article", { name: "Launch plan" }),
  ).toBeVisible();
});
