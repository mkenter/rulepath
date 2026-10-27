import { expect, test, type Page } from '@playwright/test';

const gather = '/games/ironsworn/procedures/gather-information';
const price = '/games/ironsworn/procedures/pay-the-price';

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
