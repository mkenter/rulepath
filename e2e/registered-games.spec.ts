import { expect, test } from '@playwright/test';

test('each registered game opens its own procedures and references from the library', async ({ page }) => {
  await page.goto('/');
  const games = await page.locator('[data-library-game]').evaluateAll(links => links.map(link => ({
    path: link.getAttribute('href')!,
    title: link.querySelector('[data-game-title]')!.textContent!,
  })));
  expect(games.length).toBeGreaterThan(0);
  test.setTimeout(30_000 + games.length * 10_000);

  for (const game of games) {
    await test.step(game.path, async () => {
      await page.goto('/');
      await page.locator('[data-library-game]').filter({ hasText: game.title }).and(page.locator(`[href="${game.path}"]`)).click();
      await expect(page).toHaveURL(game.path);
      await expect(page.getByRole('heading', { level: 1, name: game.title, exact: true })).toBeVisible();
      const contents = page.getByRole('navigation', { name: `${game.title} contents`, exact: true });
      const resources = await contents.getByRole('link').evaluateAll(links => links.map(link => ({
        path: link.getAttribute('href')!, title: link.getAttribute('aria-label')!,
      })));
      // One of each resource type per game; geometry and accessibility have separate suites.
      for (const kind of ['procedures', 'reference']) {
        const resource = resources.find(resource => resource.path.startsWith(`${game.path}/${kind}/`));
        if (!resource) continue;
        await page.goto(game.path);
        await page.getByRole('navigation', { name: `${game.title} contents`, exact: true }).locator(`[href="${resource.path}"]`).click();
        await expect(page).toHaveURL(resource.path);
        await expect(page.getByRole('heading', { level: 1, name: resource.title, exact: true })).toBeVisible();
      }

      await page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).getByRole('link', { name: game.title, exact: true }).click();
      await expect(page).toHaveURL(game.path);
    });
  }
});
