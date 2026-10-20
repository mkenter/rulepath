import { expect, test } from '@playwright/test';
import { registry, scenarios } from './support/content';

test('library presents an open catalog with visible interaction states', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Library | Rulepath');
  await expect(page.getByRole('link', { name: 'Rulepath library' })).toBeVisible();
  const gameRow = page.locator('[data-library-game]').first();
  await expect(gameRow).toHaveCSS('border-radius', '0px');
  await expect(gameRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const catalog = page.getByRole('region', { name: 'Games' });
  await expect(catalog).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(gameRow.getByRole('heading', { level: 2 })).toBeVisible();
  await expect(gameRow.locator('[data-game-title]')).toBeVisible();
  await expect(gameRow.locator('[data-game-counts]')).toBeVisible();
  await expect(gameRow).toContainText('Open game');
  const cta = gameRow.getByText('Open game');
  await expect(cta).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(cta).toHaveCSS('color', 'rgb(41, 35, 49)');

  await gameRow.hover();
  await expect(gameRow).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(gameRow.locator('[data-game-title]')).toHaveCSS('text-decoration-line', 'underline');
  const hoverBackground = await gameRow.evaluate(element => getComputedStyle(element).backgroundColor);
  await page.mouse.down();
  await expect(gameRow).not.toHaveCSS('background-color', hoverBackground);
  await page.mouse.move(0, 0);
  await page.mouse.up();

  await gameRow.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(gameRow).toBeFocused();
  await expect(gameRow).toHaveCSS('outline-style', 'solid');
  await expect(gameRow).toHaveCSS('outline-width', '3px');
  await expect(gameRow).toHaveCSS('outline-color', 'rgb(181, 54, 39)');
});

test('library catalog fixture retains uniform ruled entries and wraps long phone content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const originalCount = await page.locator('[data-library-game]').count();
  await page.locator('[data-library-game]').first().evaluate((entry) => {
    const item = entry.closest('li');
    const list = item?.parentElement;
    if (!item || !list) {
      throw new Error('Library fixture source was not found');
    }

    [
      ['The Cartographer’s Exceptionally Long Field Reference', 'A Publisher With a Deliberately Long Imprint Name', '128 procedures · 9 references'],
      ['A Short Game', 'Small Press', '4 procedures · 2 references'],
      ['Another Expedition', 'Atlas Workshop', '17 procedures · 105 references'],
    ].forEach(([title, publisher, counts], index) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.querySelector<HTMLElement>('[data-game-title]')!.textContent = title;
      clone.querySelector('[data-library-game]')!.setAttribute('data-catalog-fixture', String(index));
      let imprint = clone.querySelector<HTMLElement>('[data-game-publisher]');
      if (!imprint) {
        imprint = document.createElement('span');
        imprint.setAttribute('data-game-publisher', '');
        clone.querySelector('[data-game-title]')!.parentElement!.append(imprint);
      }
      imprint.textContent = publisher;
      clone.querySelector<HTMLElement>('[data-game-counts]')!.textContent = counts;
      list.append(clone);
    });
  });

  const entries = page.locator('[data-library-game]');
  await expect(entries).toHaveCount(originalCount + 3);
  const geometry = await entries.evaluateAll((links) => {
    const boxes = links.map((link) => link.getBoundingClientRect());
    const titleHeights = links.map((link) =>
      link.querySelector<HTMLElement>('[data-game-title]')!.getBoundingClientRect().height,
    );
    return {
      consistentRules: boxes.slice(1).every((box, index) =>
        Math.abs(box.top - boxes[index]!.bottom - 1) <= 1,
      ),
      sameTreatment: links.every(link => link.className === links[0]!.className),
      sameWidth: boxes.every((box) => Math.abs(box.width - boxes[0]!.width) <= 1),
      touchTargets: boxes.every((box) => box.height >= 44),
      wrapsLongTitle: titleHeights[links.findIndex(link => link.getAttribute('data-catalog-fixture') === '0')]! > titleHeights[links.findIndex(link => link.getAttribute('data-catalog-fixture') === '1')]!,
    };
  });
  expect(geometry).toEqual({
    consistentRules: true,
    sameTreatment: true,
    sameWidth: true,
    touchTargets: true,
    wrapsLongTitle: true,
  });
});

test('bundled fonts provide the editorial and UI type hierarchy without remote requests', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => document.fonts.ready);

  const typography = await page.evaluate(() => {
    const style = (selector: string) =>
      getComputedStyle(document.querySelector<HTMLElement>(selector)!);
    return {
      body: style('body').fontFamily,
      gameTitle: style('[data-library-game] [data-game-title]').fontFamily,
      pageTitle: style('main h1').fontFamily,
      fontResources: performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => name.endsWith('.woff2')),
    };
  });

  expect(typography.body).toContain('Instrument Sans Variable');
  expect(typography.gameTitle).toContain('Newsreader Variable');
  expect(typography.pageTitle).toContain('Newsreader Variable');
  expect(typography.fontResources.length).toBeGreaterThanOrEqual(2);
  expect(
    typography.fontResources.every((resource) => new URL(resource).origin === 'http://127.0.0.1:4173'),
  ).toBe(true);

  const entry = scenarios.procedures[0];
  if (!entry) return;
  await page.goto(entry.path);
  await page.evaluate(async () => document.fonts.ready);
  const diagramFamily = await page.locator('[data-flow-node-label]').first().evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );
  expect(diagramFamily).toContain('Instrument Sans Variable');
});

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
    const textureResponse = await page.evaluate(async () => {
      const response = await fetch('/textures/fine-noise.svg');
      return { ok: response.ok, contentType: response.headers.get('content-type') };
    });
    expect(textureResponse.ok).toBe(true);
    expect(textureResponse.contentType).toContain('image/svg+xml');
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


for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'large-phone', width: 430, height: 932 },
  { name: 'ipad-portrait', width: 820, height: 1180 },
  { name: 'ipad-landscape', width: 1180, height: 820 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`${viewport.name} keeps the semantic flow within the viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const entry = scenarios.decisions[0] ?? scenarios.procedures[0]!;
    test.skip(!entry, 'No registered procedure to check at this viewport.');
    await page.goto(entry.path);

    await expect(page.getByRole('region', { name: `${entry.procedure.title} procedure flow`, exact: true })).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    const layoutColumns = await page.locator('[data-procedure-layout]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean),
    );
    expect(layoutColumns).toHaveLength(viewport.width >= 900 ? 2 : 1);
  });
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'ipad-portrait', width: 820, height: 1180 },
  { name: 'ipad-landscape', width: 1180, height: 820 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`${viewport.name} keeps search controls and results inside the viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const entry = scenarios.procedures[0];
    const game = registry.games[0]!;
    const query = entry?.procedure.title ?? game.details.title;
    const path = entry?.path ?? `/games/${game.details.id}`;
    await page.goto(`/search?${new URLSearchParams({ q: query })}`);
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByRole('region', { name: /^\d+ results?$/ }).locator(`[href="${path}"]`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844, expectedWidth: 390 },
  { name: 'ipad-landscape', width: 1180, height: 820, expectedWidth: 480 },
]) {
  test(`${viewport.name} uses the intended contextual reference sheet width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const entry = scenarios.referenceLinks[0]!;
    test.skip(!entry, 'No registered reference link to measure.');
    await page.goto(entry.path);
    await page.locator(`[href="${entry.referencePath}"]`).click();

    const sheet = await page.getByRole('dialog', { name: entry.reference.title, exact: true }).boundingBox();
    expect(Math.round(sheet?.width ?? 0)).toBe(viewport.expectedWidth);
  });
}
