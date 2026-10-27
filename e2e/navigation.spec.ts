import { expect, test } from '@playwright/test';
import { registry, scenarios } from './support/content';
import { createSearchIndex, searchContent } from '../src/features/search/searchIndex';

test('direct links survive reload without fabricated ancestry', async ({ page }) => {
  const entry = scenarios.procedures[0]!;
  test.skip(!entry, 'No registered procedures to exercise direct resource navigation.');
  await page.goto(entry.path);
  await expect(page.getByRole('heading', { level: 1, name: entry.procedure.title, exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Invocation path' })).toHaveCount(0);
  const reference = scenarios.references[0];
  if (reference) {
    await page.goto(reference.path);
    await expect(page.getByRole('heading', { level: 1, name: reference.reference.title, exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.goto(entry.path);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: entry.procedure.title, exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Invocation path' })).toHaveCount(0);
});

test('references preserve context, support close and Back, and restore focus', async ({ page }) => {
  const entry = scenarios.referenceLinks[0]!;
  test.skip(!entry, 'No registered reference links; synthetic React tests cover sheet interactions.');
  await page.goto(entry.path);
  const link = page.locator(`[href="${entry.referencePath}"]`);
  await link.click();
  const dialog = page.getByRole('dialog', { name: entry.reference.title, exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: entry.procedure.title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Close ${entry.reference.title}`, exact: true }).click();
  await expect(page).toHaveURL(entry.path);
  await expect(link).toBeFocused();
  await link.click();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(entry.path);
});

test('search has removable scope and browser-history-safe results', async ({ page }) => {
  const entry = scenarios.procedures[0]!;
  test.skip(!entry, 'No registered procedures for the search navigation journey.');
  const query = entry.procedure.title;
  await page.goto(entry.path);
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(`/search?game=${entry.game.details.id}`);
  await page.getByRole('searchbox').fill(query);
  await page.getByRole('button', { name: `Remove ${entry.game.details.title} filter and search all games`, exact: true }).click();
  await expect(page).toHaveURL(`/search?${new URLSearchParams({ q: query })}`);
  const results = page.getByRole('region', { name: /^\d+ results?$/ });
  await results.locator(`[href="${entry.path}"]`).click();
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue(query);
  const index = createSearchIndex(registry);
  let absent = 'unmatched-rulepath-test';
  while (searchContent(index, absent).length) absent += 'x';
  await page.getByRole('searchbox').fill(absent);
  await expect(results.getByRole('link')).toHaveCount(0);
});

for (const width of [390, 820]) {
  test(`${width}px section jumps preserve invocation history, keyboard focus, and sheet context`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const linked = scenarios.procedureLinks.find(entry => {
      const target = entry.game.procedures.get(entry.node.target);
      return target?.keyRules.length && target.references.length;
    });
    test.skip(!linked, 'No linked procedure with supporting rules and references.');
    await page.goto(linked!.path);
    await page.locator(`[data-flow-node-id="${linked!.node.id}"]`).getByRole('link').click();
    await expect(page).toHaveURL(linked!.targetPath);
    await expect(page.getByRole('heading', {
      level: 1, name: linked!.game.procedures.get(linked!.node.target)!.title, exact: true,
    })).toBeVisible();
    const initialHistory = await page.evaluate(() => window.history.length);
    const nav = page.getByRole('navigation', { name: 'On this page' });
    await nav.getByRole('link', { name: 'Key rules', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#key-rules')).toBeFocused();
    const keyBounds = await page.locator('#key-rules').boundingBox();
    const navBounds = await nav.boundingBox();
    expect(keyBounds!.y).toBeGreaterThanOrEqual(navBounds!.y + navBounds!.height);
    await nav.getByRole('link', { name: 'References', exact: true }).click();
    await expect(page.locator('#references')).toBeFocused();
    const referenceLink = page.locator('#references a').first();
    await referenceLink.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(referenceLink).toBeFocused();
    await page.getByRole('link', { name: 'Back to procedure' }).click();
    await expect(page.locator('#procedure-flow')).toBeFocused();
    await expect(page).toHaveURL(linked!.targetPath);
    // Closing the sheet goes Back to the original history entry; section jumps add none.
    expect(await page.evaluate(() => window.history.length)).toBe(initialHistory + 1);
    await page.goBack();
    await expect(page).toHaveURL(linked!.path);
  });
}

test('related references stay contextual and one dismissal restores the original trigger', async ({ page }) => {
  await page.goto('/games/ironsworn/procedures/action-roll');
  const trigger = page.getByRole('link', { name: 'Momentum', exact: true });
  await trigger.click();
  const momentum = page.getByRole('dialog', { name: 'Momentum', exact: true });
  await expect(momentum).toBeVisible();
  // Native modality blocks programmatic focus as well as pointer and Tab access to the header.
  const headerSearch = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Search', exact: true });
  expect(await headerSearch.evaluate(element => { (element as HTMLElement).focus(); return document.activeElement === element; })).toBe(false);
  await momentum.getByRole('link', { name: 'Debilities', exact: true }).click();
  const debilities = page.getByRole('dialog', { name: 'Debilities', exact: true });
  await expect(debilities).toBeVisible();
  await expect(debilities.getByRole('button', { name: 'Close Debilities', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL('/games/ironsworn/procedures/action-roll');
  await expect(trigger).toBeFocused();
});

test('search announces a concise result count and Back restores the selected result', async ({ page }) => {
  await page.goto('/search?game=ironsworn&q=gather');
  await expect(page).toHaveTitle('Search | Rulepath');
  const result = page.getByRole('link', { name: 'Procedure Gather Information in Ironsworn', exact: true });
  await expect(page.getByRole('status')).toContainText('result');
  await result.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Gather Information', exact: true })).toBeFocused();
  await page.goBack();
  await expect(result).toBeFocused();
  await expect(result).toBeInViewport();
  await expect(page.getByRole('searchbox')).toHaveValue('gather');
});

test.describe('phone touch interaction', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('a reference opens and dismisses by touch without losing its procedure', async ({ page }) => {
    await page.goto('/games/ironsworn/procedures/action-roll');
    const trigger = page.getByRole('link', { name: 'Momentum', exact: true });
    await trigger.tap();
    const sheet = page.getByRole('dialog', { name: 'Momentum', exact: true });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Close Momentum', exact: true }).tap();
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.tap();
    await expect(sheet).toBeVisible();
    // The narrow space above the full-width phone sheet is its dismissal backdrop.
    await page.touchscreen.tap(195, 8);
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test('sheets retain their native modal behavior until each dismissal finishes', async ({ page }) => {
  const procedurePath = '/games/ironsworn/procedures/action-roll';
  await page.goto(procedurePath);
  const trigger = page.getByRole('link', { name: 'Momentum', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Momentum', exact: true });
  for (const dismissal of ['close', 'Escape', 'Back']) {
    await trigger.click();
    await expect(dialog).toBeVisible();
    // Observe the lifecycle boundary rather than asserting animation duration or CSS values.
    await dialog.evaluate(element => {
      delete document.documentElement.dataset.sheetExitProbe;
      const observer = new MutationObserver(() => {
        if (!element.hasAttribute('data-exiting')) return;
        document.documentElement.dataset.sheetExitProbe = JSON.stringify({
          modal: element.matches(':modal'),
          backgroundInert: document.querySelector<HTMLElement>('[data-route-content]')!.inert,
          focusContained: element.contains(document.activeElement),
          title: element.querySelector('h1')!.textContent,
        });
        observer.disconnect();
      });
      observer.observe(element, { attributes: true, attributeFilter: ['data-exiting'] });
    });
    if (dismissal === 'close') await dialog.getByRole('button', { name: 'Close Momentum', exact: true }).click();
    else if (dismissal === 'Escape') {
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
    } else await page.goBack();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(procedurePath);
    await expect(trigger).toBeFocused();
    await expect(page.locator('[data-route-content]')).not.toHaveAttribute('inert');
    expect(JSON.parse((await page.locator('html').getAttribute('data-sheet-exit-probe'))!)).toEqual({
      modal: true, backgroundInert: true, focusContained: true, title: 'Momentum',
    });
  }
});

test('procedure links from a sheet focus the destination after the sheet exits', async ({ page }) => {
  await page.goto('/games/ironsworn/procedures/action-roll');
  const trigger = page.getByRole('link', { name: 'Momentum', exact: true });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Momentum', exact: true });
  await sheet.getByRole('link', { name: 'Face a Setback', exact: true }).click();
  await expect(page).toHaveURL('/games/ironsworn/procedures/face-a-setback');
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Face a Setback', exact: true })).toBeFocused();
  await page.goBack();
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('browser Forward can reopen a dismissing sheet without leaving the background locked', async ({ page }) => {
  await page.goto('/games/ironsworn/procedures/action-roll');
  const trigger = page.getByRole('link', { name: 'Momentum', exact: true });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Momentum', exact: true });
  await expect(sheet).toBeVisible();
  await page.goBack();
  await page.goForward();
  await expect(sheet).toBeVisible();
  const close = sheet.getByRole('button', { name: 'Close Momentum', exact: true });
  await expect(close).toBeFocused();
  await close.click();
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('[data-route-content]')).not.toHaveAttribute('inert');
  const search = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Search', exact: true });
  await search.click();
  await expect(page.getByRole('searchbox')).toBeFocused();
});
