import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const gatherUrl = '/games/ironsworn/procedures/gather-information';
const momentumUrl = '/games/ironsworn/reference/momentum';

async function focusByKeyboard(page: Page, target: Locator) {
  await expect(target).toBeVisible();

  for (let press = 0; press < 80; press += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => document.activeElement === element)) {
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

test('representative routes and the contextual reference sheet have no axe violations', async ({
  page,
}) => {
  for (const route of [
    '/',
    '/games/ironsworn',
    '/search?game=ironsworn&q=gather',
    '/games/ironsworn/procedures/gather-information',
    momentumUrl,
  ]) {
    await page.goto(route);
    await expectNoAxeViolations(page, route);
    if (route.includes('/procedures/') || route === momentumUrl) {
      await page.getByText('Source and license').click();
      await expectNoAxeViolations(page, `${route} source disclosure`);
    }
  }

  await page.goto(gatherUrl);
  await page.getByRole('link', { name: /^Momentum/ }).click();
  await expect(page.getByRole('dialog', { name: 'Momentum' })).toBeVisible();
  await expectNoAxeViolations(page, 'contextual reference sheet');
  await page.getByRole('dialog').getByText('Source and license').click();
  await expectNoAxeViolations(page, 'contextual reference sheet source disclosure');
});

test('primary journeys remain keyboard operable with modal focus containment and restoration', async ({
  page,
}) => {
  await page.goto('/');

  const libraryGame = page.locator('[data-library-game][href="/games/ironsworn"]');
  await focusByKeyboard(page, libraryGame);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/games/ironsworn');

  const gameHomeProcedure = page.getByRole('link', { name: 'Gather Information' });
  await focusByKeyboard(page, gameHomeProcedure);
  await expect(gameHomeProcedure).toHaveCSS('outline-style', 'none');
  await expect(gameHomeProcedure).toHaveCSS(
    'background-color',
    'rgb(41, 47, 46)',
  );
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/games/ironsworn/procedures/gather-information');
  await page.goBack();
  await expect(page).toHaveURL('/games/ironsworn');

  const topSearch = page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Search' });
  await focusByKeyboard(page, topSearch);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/search?game=ironsworn');

  const searchInput = page.getByRole('searchbox', {
    name: 'Search games, procedures, and references',
  });
  await expect(searchInput).toBeFocused();
  await searchInput.fill('gather');

  const clearSearch = page.getByRole('button', { name: 'Clear search' });
  await focusByKeyboard(page, clearSearch);
  await page.keyboard.press('Enter');
  await expect(searchInput).toHaveValue('');
  await expect(searchInput).toBeFocused();

  await searchInput.fill('gather');
  const removeScope = page.getByRole('button', {
    name: 'Remove Ironsworn filter and search all games',
  });
  await focusByKeyboard(page, removeScope);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/search?q=gather');

  const result = page.getByRole('link', {
    name: 'Procedure Gather Information in Ironsworn',
  });
  await focusByKeyboard(page, result);
  await expect(result).toHaveCSS('outline-offset', '2px');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/games/ironsworn/procedures/gather-information');

  await page.goto('/games/ironsworn/procedures/gather-information');
  const procedureLink = page.getByLabel('Procedure link: Action Roll (+wits)').getByRole('link');
  await focusByKeyboard(page, procedureLink);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/games/ironsworn/procedures/action-roll');

  await page.goto(gatherUrl);
  const decision = page.getByLabel('Decision · read only: What is the action roll result?');
  await expect(decision).not.toHaveAttribute('tabindex');
  await expect(decision.getByRole('button')).toHaveCount(0);

  const momentumLink = page.getByRole('link', { name: /^Momentum/ });
  await focusByKeyboard(page, momentumLink);
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Momentum' });
  const close = page.getByRole('button', { name: 'Close Momentum' });
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
  await expect(momentumLink).toBeFocused();

  await page.goto(momentumUrl);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Momentum' })).toBeVisible();
});

test('primary controls retain the stronger 44px touch-target standard', async ({ page }) => {
  const expectMinimumTarget = async (target: Locator) => {
    const box = await target.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  };

  await page.goto('/');
  await expectMinimumTarget(
    page.getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Search' }),
  );
  await expectMinimumTarget(page.locator('[data-library-game][href="/games/ironsworn"]'));

  await page.goto('/games/ironsworn');
  await expectMinimumTarget(page.getByRole('link', { name: 'Gather Information' }));
  await expectMinimumTarget(page.getByRole('link', { name: 'Momentum' }));

  await page.goto('/search?game=ironsworn&q=gather');
  await expectMinimumTarget(page.getByRole('button', { name: 'Clear search' }));
  await expectMinimumTarget(page.getByRole('button', {
    name: 'Remove Ironsworn filter and search all games',
  }));

  await page.goto('/games/ironsworn/procedures/gather-information');
  await expectMinimumTarget(
    page.getByLabel('Procedure link: Action Roll (+wits)').getByRole('link'),
  );

  await page.goto(gatherUrl);
  await page.getByRole('link', { name: /^Momentum/ }).click();
  await expectMinimumTarget(page.getByRole('button', { name: 'Close Momentum' }));
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
  expect(ratios.brassOnShell).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnShell).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnShellHover).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnRules).toBeGreaterThanOrEqual(3);
  expect(ratios.focusOnRulesRaised).toBeGreaterThanOrEqual(3);
});

test('reduced motion removes nonessential transitions without removing state feedback', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const game = page.locator('[data-library-game][href="/games/ironsworn"]');
  const transitionDuration = await game.evaluate((element) =>
    getComputedStyle(element, '::after').transitionDuration,
  );
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.00001);

  const restBackground = await game.evaluate((element) => getComputedStyle(element).backgroundColor);
  await game.hover();
  await expect(game).not.toHaveCSS('background-color', restBackground);

  await page.goto('/games/ironsworn');
  const gameHomeEntry = page.getByRole('link', { name: 'Gather Information' });
  const gameHomeTransition = await gameHomeEntry.evaluate((element) =>
    getComputedStyle(element).transitionDuration,
  );
  expect(Number.parseFloat(gameHomeTransition)).toBeLessThanOrEqual(0.00001);
  const gameHomeRest = await gameHomeEntry.evaluate((element) =>
    getComputedStyle(element).backgroundColor,
  );
  await gameHomeEntry.hover();
  await expect(gameHomeEntry).not.toHaveCSS('background-color', gameHomeRest);

  await page.goto('/games/ironsworn/procedures/gather-information');
  const procedure = page.getByLabel('Procedure link: Action Roll (+wits)');
  const procedureTransition = await procedure.evaluate((element) =>
    getComputedStyle(element, '::after').transitionDuration,
  );
  expect(Number.parseFloat(procedureTransition)).toBeLessThanOrEqual(0.00001);
  await procedure.getByRole('link').hover();
  await expect(procedure).toHaveCSS('border-color', 'rgb(148, 118, 47)');
});
