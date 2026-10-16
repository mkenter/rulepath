import { expect, test } from '@playwright/test';

test('registered games expose canonical contents, direct resource routes, and scoped search', async ({ page }) => {
  await page.goto('/');
  const games = await page.locator('[data-library-game]').evaluateAll(links => links.map(link => ({
    path: link.getAttribute('href')!,
    title: link.querySelector('[data-game-title]')!.textContent!,
  })));
  expect(games.length).toBeGreaterThan(0);
  test.setTimeout(30_000 + games.length * 10_000);

  for (const game of games) {
    await test.step(game.path, async () => {
      expect(game.path).toMatch(/^\/games\/[a-z0-9]+(?:-[a-z0-9]+)*$/);
      await page.goto('/');
      await page.locator('[data-library-game]').filter({ hasText: game.title }).and(page.locator(`[href="${game.path}"]`)).click();
      await expect(page).toHaveURL(game.path);
      await expect(page.getByRole('heading', { level: 1, name: game.title, exact: true })).toBeVisible();
      const contents = page.getByRole('navigation', { name: `${game.title} contents`, exact: true });
      const resources = await contents.getByRole('link').evaluateAll(links => links.map(link => ({
        path: link.getAttribute('href')!, title: link.getAttribute('aria-label')!,
      })));
      for (const resource of resources) {
        expect(resource.path).toMatch(new RegExp(`^${game.path}/(procedures|reference)/[a-z0-9]+(?:-[a-z0-9]+)*$`));
      }
      expect(new Set(resources.map(resource => resource.path)).size).toBe(resources.length);

      // One of each resource type per game; geometry and accessibility have separate suites.
      for (const kind of ['procedures', 'reference']) {
        const resource = resources.find(resource => resource.path.startsWith(`${game.path}/${kind}/`));
        if (!resource) continue;
        await page.goto(game.path);
        await page.getByRole('navigation', { name: `${game.title} contents`, exact: true }).locator(`[href="${resource.path}"]`).click();
        await expect(page).toHaveURL(resource.path);
        await expect(page.getByRole('heading', { level: 1, name: resource.title, exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByRole('heading', { level: 1, name: resource.title, exact: true })).toBeVisible();
      }

      const query = resources[0]?.title ?? game.title;
      const expectedPath = resources[0]?.path ?? game.path;
      const gameId = game.path.split('/').at(-1)!;
      await page.goto(`/search?${new URLSearchParams({ game: gameId, q: query })}`);
      const results = page.getByRole('region', { name: /^\d+ results?$/ });
      await expect(results.locator(`[href="${expectedPath}"]`)).toBeVisible();
      const scopedPaths = await results.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!));
      for (const path of scopedPaths) expect(path === game.path || path.startsWith(`${game.path}/`)).toBe(true);
      await page.getByRole('button', { name: `Remove ${game.title} filter and search all games`, exact: true }).click();
      await expect(page.getByText('Searching all games', { exact: true })).toBeVisible();
      await expect(results.locator(`[href="${expectedPath}"]`)).toBeVisible();
    });
  }
});
