import { mkdir } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

const outputDir = "artifacts/screenshots";

const viewports = {
  phone: { width: 390, height: 844 },
  ipadPortrait: { width: 820, height: 1180 },
  ipadLandscape: { width: 1180, height: 820 },
  desktop: { width: 1440, height: 900 },
} as const;

async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // Give layout/transitions a moment to finish after fonts resolve.
  await page.waitForTimeout(150);
}

async function focusByKeyboard(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (let press = 0; press < 80; press += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => document.activeElement === element)) {
      await expect(target).toBeFocused();
      return;
    }
  }
  throw new Error("Screenshot target was not reached through keyboard traversal");
}

async function capture(
  page: Page,
  name: string,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await settle(page);

  await page.screenshot({
    path: `${outputDir}/${name}.png`,
    fullPage: false,
    animations: "disabled",
  });
}

test.beforeAll(async () => {
  await mkdir(outputDir, { recursive: true });
});

test("capture application screenshots", async ({ page }) => {
  test.setTimeout(120_000);
  const routes = [
    ["library", "/"],
    ["game", "/games/ironsworn"],
    ["search", "/search?game=ironsworn&q=gather"],
    ["gather", "/games/ironsworn/procedures/gather-information"],
    ["action-roll", "/games/ironsworn/procedures/action-roll"],
    ["price", "/games/ironsworn/procedures/pay-the-price"],
    ["oracle", "/games/ironsworn/procedures/ask-the-oracle"],
    ["reference", "/games/ironsworn/reference/momentum"],
  ];
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    for (const [name, route] of routes) {
      await page.setViewportSize(viewport);
      await page.goto(route!);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await capture(page, `${name}-${viewportName}`, viewport);
    }
    await page.goto("/games/ironsworn/procedures/gather-information");
    await page.getByRole("link", { name: "Momentum", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Momentum" })).toBeVisible();
    await capture(page, `reference-sheet-${viewportName}`, viewport);
  }
  await page.goto("/games/ironsworn/procedures/gather-information");
  const link = page.getByLabel("Procedure link: Action Roll (+wits)").getByRole("link");
  await link.hover();
  await capture(page, "procedure-hover", viewports.ipadLandscape);
  await focusByKeyboard(page, link);
  await capture(page, "procedure-focus", viewports.ipadLandscape);
});
