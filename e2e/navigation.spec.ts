import { expect, test } from '@playwright/test';
import { registry, scenarios } from './support/content';
import { unusedId } from '../tests/content-scenarios';
import { createSearchIndex, searchContent } from '../src/features/search/searchIndex';

// IDs for not-found checks are selected outside the registered namespaces.
const missingGame = unusedId(registry.games.map(game => game.details.id));

test('direct links, unknown resources, and the removed developer flag behave safely', async ({ page }) => {
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
  const missing = unusedId([...entry.game.procedures.keys(), ...entry.game.references.keys()]);
  for (const route of [`/games/${missingGame}`, `/games/${entry.game.details.id}/procedures/${missing}`, `/games/${entry.game.details.id}/reference/${missing}`, '/missing']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'That rules entry is not in this library' })).toBeVisible();
  }
  await page.goto(`${entry.path}?rail-stress=1`);
  await expect(page.getByLabel('Synthetic developer fixture')).toHaveCount(0);
  await expect(page.locator('[data-flow-node-id]')).toHaveCount(entry.procedure.nodes.length);
  await expect(page.getByRole('list', { name: 'Procedure connections' }).getByRole('listitem')).toHaveCount(entry.procedure.edges.length);
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
