import { expect, test, type Page } from '@playwright/test';

const gather = '/games/ironsworn/procedures/gather-information';
const price = '/games/ironsworn/procedures/pay-the-price';
const oracle = '/games/ironsworn/procedures/ask-the-oracle';

async function nested(page: Page) {
  await page.goto(gather);
  await page.getByLabel('Procedure link: Pay the Price', { exact: true }).getByRole('link').click();
  await page.getByLabel(/Procedure link: Ask the Oracle/).getByRole('link').click();
}

test('nested links preserve browser Back and trim ancestry on ancestor jumps', async ({ page }) => {
  await nested(page);
  const path = page.getByRole('navigation', { name: 'Invocation path' });
  await expect(path).toContainText('Gather Information');
  await expect(path).toContainText('Pay the Price');
  await page.goBack();
  await expect(page).toHaveURL(price);
  await page.goBack();
  await expect(page).toHaveURL(gather);
  await nested(page);
  await path.getByRole('link', { name: 'Gather Information' }).click();
  await expect(page).toHaveURL(gather);
  await expect(path).toHaveCount(0);
});

test('direct links, unknown resources, and the removed developer flag behave safely', async ({ page }) => {
  await page.goto(oracle);
  await expect(page.getByRole('heading', { name: 'Ask the Oracle (Yes/No)' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Invocation path' })).toHaveCount(0);
  await page.goto('/games/ironsworn/reference/momentum');
  await expect(page.getByRole('heading', { name: 'Momentum' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/games/ironsworn/procedures/missing');
  await expect(page.getByRole('heading', { name: 'That rules entry is not in this library' })).toBeVisible();
  await page.goto(`${gather}?rail-stress=1`);
  await expect(page.getByLabel('Synthetic developer fixture')).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Procedure connections' })).not.toContainText('Rail stress');
});

test('references preserve context, support close and Back, and contain focus', async ({ page }) => {
  await page.goto(gather);
  const link = page.getByRole('link', { name: 'Momentum', exact: true });
  await link.click();
  const dialog = page.getByRole('dialog', { name: 'Momentum' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gather Information' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Momentum' }).click();
  await expect(page).toHaveURL(gather);
  await expect(link).toBeFocused();
  await link.click();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(gather);
});

test('search has removable scope and browser-history-safe results', async ({ page }) => {
  await page.goto(gather);
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Search' }).click();
  await expect(page).toHaveURL('/search?game=ironsworn');
  await page.getByRole('searchbox').fill('gather');
  await page.getByRole('button', { name: 'Remove Ironsworn filter and search all games' }).click();
  await expect(page).toHaveURL('/search?q=gather');
  await page.getByRole('link', { name: 'Procedure Gather Information in Ironsworn' }).click();
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('gather');
  await page.getByRole('searchbox').fill('no such rule xyz');
  await expect(page.getByRole('link', { name: /^Procedure / })).toHaveCount(0);
});

test('phone controls expose the immediate parent and full ancestor path', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await nested(page);
  await expect(page.getByRole('navigation', { name: 'Invocation path' })).toBeHidden();
  const controls = page.getByRole('navigation', { name: 'Procedure path controls' });
  await expect(controls.getByRole('link', { name: 'Pay the Price' }).first()).toBeVisible();
  await controls.getByLabel('Open full invocation path').click();
  const sheet = controls.locator('[data-path-sheet]');
  await expect(sheet).toBeVisible();
  await sheet.getByRole('link', { name: 'Gather Information' }).click();
  await expect(page).toHaveURL(gather);
});

test('attribution and license links are available in the production app', async ({ page }) => {
  await page.goto('/games/ironsworn/reference/credits');
  await page.getByText('Source and license').click();
  await expect(page.getByText('Copyright ©2018 Shawn Tomkin.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Creative Commons Attribution 4.0/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Creative Commons Attribution 4.0/ })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
  await expect(page.getByRole('link', { name: 'Ironsworn System Reference Document' })).toHaveAttribute('href', 'https://docs.google.com/document/d/11ypqt6GfLuBhGDJuBGWKlHa-Ru48Tf3G_6zbrYKmXgY/edit');
});

test('every sample resource is reachable and fits a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/games/ironsworn');
  const paths = await page.getByRole('navigation', { name: 'Ironsworn contents' }).getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!));
  expect(paths).toHaveLength(11);
  for (const path of paths) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByText('Source and license').click();
    await expect(page.getByRole('link', { name: /Creative Commons Attribution 4.0/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ironsworn System Reference Document' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
});
