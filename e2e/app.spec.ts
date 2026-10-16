import { expect, test } from '@playwright/test';
import { registry, scenarios } from './support/content';

test('library presents a flat editorial catalog with tailored interaction states', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Library | Rulepath');
  await expect(page.getByRole('link', { name: 'Rulepath library' })).toBeVisible();
  const gameRow = page.locator('[data-library-game]').first();

  const rest = await gameRow.evaluate((element) => {
    const style = getComputedStyle(element);
    const identity = getComputedStyle(element, '::before');
    const rule = getComputedStyle(element, '::after');
    return {
      background: style.backgroundColor,
      borderRadius: style.borderRadius,
      bottomRule: style.borderBottomColor,
      identityColor: identity.backgroundColor,
      accent: (style.getPropertyValue('--catalog-accent') || style.getPropertyValue('--trn-brass')).trim(),
      identityHeight: identity.height,
      identityWidth: identity.width,
      ruleHeight: rule.height,
      ruleTransform: rule.transform,
      titleColor: getComputedStyle(
        element.querySelector<HTMLElement>('[data-game-title]')!,
      ).color,
    };
  });
  expect(rest.borderRadius).toBe('0px');
  expect(rest.bottomRule).toBe('rgb(77, 83, 83)');
  const channels = rest.accent.slice(1).match(/.{2}/g)!.map(channel => Number.parseInt(channel, 16));
  expect(rest.identityColor).toBe(`rgb(${channels.join(', ')})`);
  expect(rest.identityHeight).toBe('24px');
  expect(rest.identityWidth).toBe('2px');
  expect(rest.ruleHeight).toBe('1px');
  expect(rest.ruleTransform).not.toBe('none');

  await gameRow.hover();
  await expect.poll(() => gameRow.evaluate((element) =>
    getComputedStyle(element, '::after').transform,
  )).toBe('matrix(1, 0, 0, 1, 0, 0)');
  await expect(gameRow).not.toHaveCSS('background-color', rest.background);
  await expect.poll(() => gameRow.evaluate((element) =>
    getComputedStyle(element, '::before').width,
  )).toBe('3px');
  await expect.poll(() => gameRow.locator('[data-game-title]').evaluate((element) =>
    getComputedStyle(element).color,
  )).not.toBe(rest.titleColor);

  await page.mouse.down();
  await page.mouse.move(0, 0);
  await expect(gameRow).toHaveCSS('background-color', 'rgb(24, 28, 28)');
  await page.mouse.up();

  await gameRow.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(gameRow).toBeFocused();
  await expect(gameRow).toHaveCSS('outline-style', 'none');
  await expect(gameRow).toHaveCSS('background-color', 'rgb(41, 47, 46)');
  await expect.poll(() => gameRow.evaluate((element) => {
    const identity = getComputedStyle(element, '::before');
    return {
      color: identity.backgroundColor,
      height: identity.height,
      width: identity.width,
    };
  })).toEqual({
    color: 'rgb(228, 209, 154)',
    height: '40px',
    width: '4px',
  });
  await expect(gameRow.locator('[data-game-title]'))
    .toHaveCSS('color', 'rgb(228, 209, 154)');
  const focusRules = await gameRow.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(focusRules.match(/rgb\(228, 209, 154\)/g)).toHaveLength(2);
  await expect.poll(() => gameRow.evaluate((element) =>
    getComputedStyle(element, '::after').transform,
  )).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
});

test('library catalog fixture scales to adjacent entries and long phone content', async ({ page }) => {
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
      adjacent: boxes.slice(1).every((box, index) =>
        Math.abs(box.top - boxes[index]!.bottom) <= 1,
      ),
      sameWidth: boxes.every((box) => Math.abs(box.width - boxes[0]!.width) <= 1),
      touchTargets: boxes.every((box) => box.height >= 44),
      wrapsLongTitle: titleHeights[links.findIndex(link => link.getAttribute('data-catalog-fixture') === '0')]! > titleHeights[links.findIndex(link => link.getAttribute('data-catalog-fixture') === '1')]!,
    };
  });
  expect(geometry).toEqual({
    adjacent: true,
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
      pageTitle: style('[data-page-header] h1').fontFamily,
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
  { name: 'ipad-landscape', width: 1180, height: 820, expectedWidth: 400 },
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
