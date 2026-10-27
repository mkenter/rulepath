import { expect, test } from '@playwright/test';
import { registry, scenarios } from './support/content';

test('production PWA exposes a standalone manifest and serves canonical routes offline', async ({
  context,
  page,
}) => {
  const game = registry.games[0]!;
  const procedure = scenarios.procedures[0];
  const reference = scenarios.references[0];
  const query = procedure?.procedure.title ?? game.details.title;
  const resultPath = procedure?.path ?? `/games/${game.details.id}`;
  await page.goto('/');
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifest).toBeTruthy();
  const manifestResponse = await page.request.get(manifest!);
  expect(await manifestResponse.json()).toMatchObject({
    name: 'Rulepath', short_name: 'Rulepath',
    description: 'Rulepath: connected tabletop rules procedures and references.',
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  try {
    await page.goto(`/search?${new URLSearchParams({ q: query })}`);
    await expect(page.getByRole('region', { name: /^\d+ results?$/ }).locator(`[href="${resultPath}"]`)).toBeVisible();
    if (procedure) {
      await page.goto(procedure.path);
      await expect(page.getByRole('heading', { level: 1, name: procedure.procedure.title, exact: true })).toBeVisible();
    }
    if (reference) {
      await page.goto(reference.path);
      await expect(page.getByRole('heading', { level: 1, name: reference.reference.title, exact: true })).toBeVisible();
    }
  } finally {
    await context.setOffline(false);
  }
});
