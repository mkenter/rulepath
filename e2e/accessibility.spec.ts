import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { registry, scenarios } from './support/content';

async function focusByKeyboard(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const limit = await page.locator('a[href], button, input, summary, [tabindex]').count() + 1;
  for (let press = 0; press < limit; press += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate(element => document.activeElement === element)) {
      await expect(target).toBeFocused();
      return;
    }
  }
  throw new Error('Target was not reached through forward keyboard traversal');
}

async function expectNoAxeViolations(page: Page, context?: string) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, context).toEqual([]);
}

test('representative registered routes and source disclosures have no axe violations', async ({ page }) => {
  const game = registry.games[0]!;
  const procedure = scenarios.procedures[0];
  const reference = scenarios.references[0];
  const routes = ['/', `/games/${game.details.id}`, `/search?${new URLSearchParams({ game: game.details.id, q: game.details.title })}`];
  if (procedure) routes.push(procedure.path);
  if (reference) routes.push(reference.path);
  for (const route of routes) {
    await page.goto(route);
    await expectNoAxeViolations(page, route);
    if (route === procedure?.path || route === reference?.path) {
      await page.getByText('Source and license', { exact: true }).click();
      await expectNoAxeViolations(page, `${route} source disclosure`);
    }
  }
});

test('a registered contextual reference sheet and its disclosure have no axe violations', async ({ page }) => {
  const entry = scenarios.referenceLinks[0]!;
  test.skip(!entry, 'No registered procedure links to a reference; fixture-only React tests cover the sheet contract.');
  await page.goto(entry.path);
  await page.locator(`[href="${entry.referencePath}"]`).click();
  const dialog = page.getByRole('dialog', { name: entry.reference.title, exact: true });
  await expect(dialog).toBeVisible();
  await expectNoAxeViolations(page, 'contextual reference sheet');
  await dialog.getByText('Source and license', { exact: true }).click();
  await expectNoAxeViolations(page, 'contextual reference sheet source disclosure');
});

test('library, contents, and scoped search remain keyboard operable', async ({ page }) => {
  const entry = scenarios.procedures[0]!;
  test.skip(!entry, 'No registered procedures to exercise this journey.');
  const gamePath = `/games/${entry.game.details.id}`;
  const query = entry.procedure.title;
  await page.goto('/');
  await focusByKeyboard(page, page.locator(`[data-library-game][href="${gamePath}"]`));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(gamePath);
  const procedure = page.locator(`[data-game-home-entry][href="${entry.path}"]`);
  await focusByKeyboard(page, procedure);
  await expect(procedure).toHaveCSS('outline-style', 'solid');
  await expect(procedure).toHaveCSS('outline-width', '2px');
  await expect(procedure).toHaveCSS('outline-color', 'rgb(38, 63, 55)');
  await expect(procedure).toHaveCSS('background-color', 'rgb(227, 233, 220)');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(entry.path);
  await page.goBack();
  await expect(page).toHaveURL(gamePath);
  const topSearch = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Search', exact: true });
  await focusByKeyboard(page, topSearch);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`/search?game=${entry.game.details.id}`);
  const input = page.getByRole('searchbox', { name: 'Search games, procedures, and references' });
  await expect(input).toBeFocused();
  await input.fill(query);
  await focusByKeyboard(page, page.getByRole('button', { name: 'Clear search', exact: true }));
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await input.fill(query);
  await focusByKeyboard(page, page.getByRole('button', { name: `Remove ${entry.game.details.title} filter and search all games`, exact: true }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`/search?${new URLSearchParams({ q: query })}`);
  const result = page.getByRole('region', { name: /^\d+ results?$/ }).locator(`[href="${entry.path}"]`);
  await focusByKeyboard(page, result);
  await expect(result).toHaveCSS('outline-offset', '2px');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(entry.path);
});

test('registered procedure links are keyboard operable', async ({ page }) => {
  const linked = scenarios.procedureLinks[0]!;
  test.skip(!linked, 'No registered procedure links; synthetic renderer and React tests cover this contract.');
  await page.goto(linked.path);
  const link = page.locator(`[data-flow-node-id="${linked.node.id}"] [data-flow-node-type="procedure"]`).getByRole('link');
  await focusByKeyboard(page, link);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(linked.targetPath);
});

test('registered decisions remain read only', async ({ page }) => {
  const choice = scenarios.decisions[0]!;
  test.skip(!choice, 'No registered decision; synthetic renderer tests cover read-only decisions.');
  await page.goto(choice.path);
  const decision = page.locator(`[data-flow-node-id="${choice.node.id}"] [data-flow-node-type="decision"]`);
  await expect(decision).not.toHaveAttribute('tabindex');
  await expect(decision.getByRole('button')).toHaveCount(0);
});

test('reference sheets contain keyboard focus and restore it on Escape', async ({ page }) => {
  const entry = scenarios.referenceLinks[0]!;
  test.skip(!entry, 'No registered reference links; fixture-only React tests cover modal focus.');
  await page.goto(entry.path);
  const link = page.locator(`[href="${entry.referencePath}"]`);
  await focusByKeyboard(page, link);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: entry.reference.title, exact: true });
  const close = dialog.getByRole('button', { name: `Close ${entry.reference.title}`, exact: true });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(page.locator('[data-route-content]')).toHaveAttribute('inert', '');
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator('summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await dialog.locator('summary').click();
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(link).toBeFocused();
  await page.goto(entry.referencePath);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: entry.reference.title, exact: true })).toBeVisible();
});

test('primary controls retain the stronger 44px touch-target standard', async ({ page }) => {
  const minimum = async (target: Locator) => {
    const box = await target.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  };
  await page.goto('/');
  await minimum(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Search', exact: true }));
  await minimum(page.locator('[data-library-game]').first());
  const entry = scenarios.procedures[0];
  if (entry) {
    await page.goto(`/games/${entry.game.details.id}`);
    await minimum(page.locator(`[data-game-home-entry][href="${entry.path}"]`));
    await page.goto(`/search?${new URLSearchParams({ game: entry.game.details.id, q: entry.procedure.title })}`);
    await minimum(page.getByRole('button', { name: 'Clear search', exact: true }));
    await minimum(page.getByRole('button', { name: `Remove ${entry.game.details.title} filter and search all games`, exact: true }));
  }
  const linked = scenarios.procedureLinks[0];
  if (linked) {
    await page.goto(linked.path);
    await minimum(page.locator(`[data-flow-node-id="${linked.node.id}"] [data-flow-node-type="procedure"]`).getByRole('link'));
  }
  const reference = scenarios.referenceLinks[0];
  if (reference) {
    await page.goto(`/games/${reference.game.details.id}`);
    await minimum(page.locator(`[data-game-home-entry][href="${reference.referencePath}"]`));
    await page.goto(reference.path);
    await page.locator(`[href="${reference.referencePath}"]`).click();
    await minimum(page.getByRole('button', { name: `Close ${reference.reference.title}`, exact: true }));
  }
});
test('shared header uses consistent warm hover and keyboard focus states', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const headerLinks = [
    page.getByRole('link', { name: 'Rulepath library', exact: true }),
    page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Library', exact: true }),
    page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Search', exact: true }),
  ];
  for (const link of headerLinks) {
    await link.hover();
    await expect(link).toHaveCSS('color', 'rgb(235, 220, 186)');
    await expect(link).toHaveCSS('background-color', 'rgb(58, 81, 68)');
    await page.mouse.move(0, 100);
    await focusByKeyboard(page, link);
    await expect(link).toHaveCSS('color', 'rgb(235, 220, 186)');
    await expect(link).toHaveCSS('background-color', 'rgb(58, 81, 68)');
    await expect(link).toHaveCSS('outline-color', 'rgb(223, 205, 165)');
    await expect(link).toHaveCSS('outline-width', '2px');
  }
});

test('Field Atlas text and focus roles meet their required contrast ratios', async ({ page }) => {
  await page.goto('/');

  const ratios = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue(name).trim();
    const channels = (color: string) => {
      const hex = color.slice(1);
      return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
    };
    const luminance = (color: string) => {
      const [red, green, blue] = channels(color).map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
    };
    const contrast = (foreground: string, background: string) => {
      const light = Math.max(luminance(foreground), luminance(background));
      const dark = Math.min(luminance(foreground), luminance(background));
      return (light + 0.05) / (dark + 0.05);
    };

    return {
      brassOnShell: contrast(token('--trn-brass'), token('--trn-shell-raised')),
      sandOnForest: contrast(token('--trn-signal'), token('--trn-forest')),
      sandOnHeaderHover: contrast(token('--trn-signal-hover'), token('--trn-navigation-hover')),
      focusOnHeaderHover: contrast(token('--trn-focus-on-shell'), token('--trn-navigation-hover')),
      focusOnSand: contrast(token('--trn-focus-on-rules'), token('--trn-signal')),
      focusOnSandHover: contrast(token('--trn-focus-on-rules'), token('--trn-signal-hover')),
      focusOnRules: contrast(token('--trn-focus-on-rules'), token('--trn-paper')),
      focusOnRulesRaised: contrast(token('--trn-focus-on-rules'), token('--trn-paper-raised')),
      focusOnShell: contrast(token('--trn-focus-on-shell'), token('--trn-shell-raised')),
      focusOnShellHover: contrast(
        token('--trn-focus-on-shell'),
        token('--trn-shell-raised-hover'),
      ),
      shellMutedText: contrast(token('--trn-text-dark-muted'), token('--trn-shell-950')),
      shellText: contrast(token('--trn-text-dark-primary'), token('--trn-shell-950')),
      rulesMutedText: contrast(token('--trn-text-paper-muted'), token('--trn-paper')),
      rulesText: contrast(token('--trn-text-paper-primary'), token('--trn-paper')),
    };
  });

  expect(ratios.shellText).toBeGreaterThanOrEqual(4.5);
  expect(ratios.shellMutedText).toBeGreaterThanOrEqual(4.5);
  expect(ratios.rulesText).toBeGreaterThanOrEqual(4.5);
  expect(ratios.rulesMutedText).toBeGreaterThanOrEqual(4.5);
  expect(ratios.sandOnForest).toBeGreaterThanOrEqual(4.5);
  expect(ratios.sandOnHeaderHover).toBeGreaterThanOrEqual(4.5);
  expect(ratios.focusOnHeaderHover).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnSand).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnSandHover).toBeGreaterThanOrEqual(3);
  expect(ratios.brassOnShell).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnShell).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnShellHover).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnRules).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnRulesRaised).toBeGreaterThanOrEqual(3);
});

test('reduced motion removes nonessential transitions without removing state feedback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const game = page.locator('[data-library-game]').first();
  expect(Number.parseFloat(await game.evaluate(element => getComputedStyle(element, '::after').transitionDuration))).toBeLessThanOrEqual(0.00001);
  const rest = await game.evaluate(element => getComputedStyle(element).backgroundColor);
  await game.hover();
  await expect(game).not.toHaveCSS('background-color', rest);
  const entry = scenarios.procedures[0];
  if (entry) {
    await page.goto(`/games/${entry.game.details.id}`);
    const row = page.locator(`[data-game-home-entry][href="${entry.path}"]`);
    expect(Number.parseFloat(await row.evaluate(element => getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.00001);
    const background = await row.evaluate(element => getComputedStyle(element).backgroundColor);
    await row.hover();
    await expect(row).not.toHaveCSS('background-color', background);
  }
  const linked = scenarios.procedureLinks[0];
  if (linked) {
    await page.goto(linked.path);
    const card = page.locator(`[data-flow-node-id="${linked.node.id}"] [data-flow-node-type="procedure"]`);
    expect(Number.parseFloat(await card.evaluate(element => getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.00001);
    const restingBackground = await card.evaluate(element => getComputedStyle(element).backgroundColor);
    await card.getByRole('link').hover();
    await expect(card).not.toHaveCSS('background-color', restingBackground);
  }
});
