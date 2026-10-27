import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const baseURL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = fileURLToPath(new URL('.', import.meta.url));
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(`${baseURL}/games/ironsworn`);
  await expect(page.getByRole('heading', { level: 1, name: 'Ironsworn', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${outputDirectory}/game-home.png`,
    fullPage: false,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.getByRole('link', { name: /Gather Information/ }).click();
  await page.getByLabel('Procedure link: Pay the Price', { exact: true }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pay the Price', exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.waitForTimeout(200);
  const flowBounds = await page.locator('[data-procedure-diagram]').boundingBox();
  if (!flowBounds || flowBounds.y < 0 || flowBounds.y + flowBounds.height > 1200) {
    throw new Error('The complete procedure must fit inside the capture.');
  }
  await page.screenshot({
    path: `${outputDirectory}/procedure-flow.png`,
    fullPage: true,
    animations: 'disabled',
  });
} finally {
  await browser.close();
}
