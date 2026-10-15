import { expect, test, type Page } from '@playwright/test';

const gatherUrl = '/games/ironsworn/procedures/gather-information';
const actionUrl = '/games/ironsworn/procedures/action-roll';
const priceUrl = '/games/ironsworn/procedures/pay-the-price';
const momentumUrl = '/games/ironsworn/reference/momentum';

async function expectCenteredRailGeometry(page: Page) {
  await expect(page.locator('[data-route-kind]').first()).toBeAttached();
  const geometry = await page.locator('[data-flow-list]').evaluate((list) => {
    const listBounds = list.getBoundingClientRect();
    const nodes = [...list.querySelectorAll<HTMLElement>('[data-flow-node]')];
    const orderedItems = [...list.querySelectorAll<HTMLElement>('[data-flow-node-id]')];
    const nodeOrder = new Map(
      orderedItems.map((item, index) => [item.dataset.flowNodeId ?? '', index]),
    );
    const widestNode = nodes
      .map((node) => node.getBoundingClientRect())
      .sort((left, right) => right.width - left.width)[0];
    const diagramBounds = list.closest('[data-procedure-diagram]')?.getBoundingClientRect();
    const railX = (selector: string) =>
      [...list.querySelectorAll<SVGPathElement>(selector)]
        .map((path) => path.getAttribute('d')?.match(/ H ([\d.-]+)/)?.[1])
        .flatMap((value) => (value ? [Math.round(Number(value))] : []));
    const bypassRoutes = [
      ...list.querySelectorAll<SVGGElement>('[data-route-kind="bypass"]'),
    ].flatMap((route) => {
      const from = nodeOrder.get(route.dataset.edgeFrom ?? '');
      const to = nodeOrder.get(route.dataset.edgeTo ?? '');
      const rail = route.querySelector('path')?.getAttribute('d')?.match(/ H ([\d.-]+)/)?.[1];
      const direction = route.dataset.routeDirection;
      return from === undefined || to === undefined || rail === undefined
        ? []
        : [{
            direction,
            end: Math.max(from, to),
            rail: Number(rail),
            start: Math.min(from, to),
          }];
    });
    const hierarchyViolations = bypassRoutes.flatMap((inner, innerIndex) =>
      bypassRoutes.slice(innerIndex + 1).flatMap((outer) => {
        if (inner.direction !== outer.direction) {
          return [];
        }
        const innerInsideOuter = inner.start > outer.start && inner.end < outer.end;
        const outerInsideInner = outer.start > inner.start && outer.end < inner.end;
        const innerDistance = inner.direction === 'right'
          ? inner.rail - (widestNode?.right ?? 0) + listBounds.left
          : (widestNode?.left ?? 0) - listBounds.left - inner.rail;
        const outerDistance = outer.direction === 'right'
          ? outer.rail - (widestNode?.right ?? 0) + listBounds.left
          : (widestNode?.left ?? 0) - listBounds.left - outer.rail;
        return (innerInsideOuter && innerDistance >= outerDistance) ||
          (outerInsideInner && outerDistance >= innerDistance)
          ? [`${inner.start}-${inner.end}:${outer.start}-${outer.end}`]
          : [];
      }),
    );
    const nodeOverlap = orderedItems.some((item, index) => {
      const next = orderedItems[index + 1];
      return next ? item.getBoundingClientRect().bottom > next.getBoundingClientRect().top : false;
    });

    if (!widestNode || !diagramBounds) {
      throw new Error('Flow geometry was not measurable');
    }

    return {
      leftBypassRailX: railX(
        '[data-route-kind="bypass"][data-route-direction="left"] path',
      ),
      columnLeft: widestNode.left - listBounds.left,
      columnRight: widestNode.right - listBounds.left,
      leftGutter: widestNode.left - listBounds.left,
      loopRailX: railX('[data-route-kind="loop"] path'),
      rightBypassRailX: railX(
        '[data-route-kind="bypass"][data-route-direction="right"] path',
      ),
      rightGutter: listBounds.right - widestNode.right,
      spineCenter: widestNode.left + widestNode.width / 2,
      canvasCenter: diagramBounds.left + diagramBounds.width / 2,
      hierarchyViolations,
      nodeOverlap,
    };
  });

  expect(Math.abs(geometry.spineCenter - geometry.canvasCenter)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.leftGutter - geometry.rightGutter)).toBeLessThanOrEqual(1);
  expect(geometry.leftBypassRailX.every((x) => x < geometry.columnLeft)).toBe(true);
  expect(geometry.rightBypassRailX.every((x) => x > geometry.columnRight)).toBe(true);
  expect(geometry.loopRailX.every((x) => x > geometry.columnRight)).toBe(true);
  expect(geometry.hierarchyViolations).toEqual([]);
  expect(geometry.nodeOverlap).toBe(false);

  for (const railPositions of [geometry.leftBypassRailX, geometry.rightBypassRailX]) {
    const distinctBypassLanes = [...new Set(railPositions)].sort((a, b) => a - b);
    const laneSteps = distinctBypassLanes
      .slice(1)
      .map((x, index) => x - distinctBypassLanes[index]!);
    expect(laneSteps.every((step) => step === 16)).toBe(true);
  }

  const nearestSideRail = Math.min(
    ...geometry.leftBypassRailX.map((x) => geometry.columnLeft - x),
    ...geometry.rightBypassRailX.map((x) => x - geometry.columnRight),
    ...geometry.loopRailX.map((x) => x - geometry.columnRight),
  );
  expect(nearestSideRail).toBeGreaterThanOrEqual(16);
}

test('library presents a flat editorial catalog with tailored interaction states', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Library | Rulepath');
  await expect(page.getByRole('link', { name: 'Rulepath library' })).toBeVisible();
  const gameRow = page.locator('[data-library-game]');

  const rest = await gameRow.evaluate((element) => {
    const style = getComputedStyle(element);
    const identity = getComputedStyle(element, '::before');
    const rule = getComputedStyle(element, '::after');
    return {
      background: style.backgroundColor,
      borderRadius: style.borderRadius,
      bottomRule: style.borderBottomColor,
      identityColor: identity.backgroundColor,
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
  expect(rest.identityColor).toBe('rgb(185, 154, 88)');
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

  await page.locator('[data-library-game]').evaluate((entry) => {
    const item = entry.closest('li');
    const list = item?.parentElement;
    if (!item || !list) {
      throw new Error('Library fixture source was not found');
    }

    [
      ['The Cartographer’s Exceptionally Long Field Reference', 'A Publisher With a Deliberately Long Imprint Name', '128 procedures · 9 references'],
      ['A Short Game', 'Small Press', '4 procedures · 2 references'],
      ['Another Expedition', 'Atlas Workshop', '17 procedures · 105 references'],
    ].forEach(([title, publisher, counts]) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.querySelector<HTMLElement>('[data-game-title]')!.textContent = title;
      clone.querySelector<HTMLElement>('[data-game-publisher]')!.textContent = publisher;
      clone.querySelector<HTMLElement>('[data-game-counts]')!.textContent = counts;
      list.append(clone);
    });
  });

  const entries = page.locator('[data-library-game]');
  await expect(entries).toHaveCount(4);
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
      wrapsLongTitle: titleHeights[1]! > titleHeights[0]!,
    };
  });
  expect(geometry).toEqual({
    adjacent: true,
    sameWidth: true,
    touchTargets: true,
    wrapsLongTitle: true,
  });
});

test('game home is a flat dark editorial index with responsive columns and owned states', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto('/games/ironsworn');

  const gameHome = page.locator('[data-game-home]');
  const titleZone = page.locator('[data-game-home-title]');
  const entries = page.locator('[data-game-home-entry]');
  const procedure = page.getByRole('link', { name: 'Gather Information' });
  const reference = page.getByRole('link', { name: 'Momentum' });

  await expect(entries).toHaveCount(11);
  await expect(page.locator('[data-resource-kind="procedure"]')).toHaveCount(5);
  await expect(page.locator('[data-resource-kind="reference"]')).toHaveCount(6);
  await expect(gameHome).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(titleZone).toHaveCSS('border-bottom-color', 'rgb(77, 83, 83)');
  await expect(page.locator('[data-game-home-sections]')).toHaveCSS('column-count', '2');
  await expect(page.locator('[data-game-home-reference-list]')).toHaveCSS('column-count', '3');

  const restBackground = await procedure.evaluate((element) =>
    getComputedStyle(element).backgroundColor,
  );
  await procedure.hover();
  await expect(procedure).not.toHaveCSS('background-color', restBackground);
  await expect(procedure).not.toHaveCSS('border-bottom-color', 'rgb(77, 83, 83)');

  await page.mouse.down();
  await expect(procedure).toHaveCSS('background-color', 'rgb(24, 28, 28)');
  await page.mouse.move(0, 0);
  await page.mouse.up();

  await procedure.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(procedure).toBeFocused();
  await expect(procedure).toHaveCSS('outline-style', 'none');
  await expect(procedure).toHaveCSS('color', 'rgb(228, 209, 154)');
  expect(await procedure.evaluate((element) => getComputedStyle(element).boxShadow))
    .toContain('rgb(228, 209, 154)');

  for (const target of [procedure, reference]) {
    const box = await target.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-game-home-sections]')).toHaveCSS('column-count', '1');
  await expect(page.locator('[data-game-home-reference-list]')).toHaveCSS('column-count', '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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

  await page.goto(gatherUrl);
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
    await page.goto('/search?q=gather');
    await expect(page.getByRole('link', { name: 'Procedure Gather Information in Ironsworn' })).toBeVisible();
    await page.goto(gatherUrl);
    await expect(page.getByRole('heading', { name: 'Gather Information' })).toBeVisible();
    await page.goto(momentumUrl);
    await expect(page.getByRole('heading', { name: 'Momentum' })).toBeVisible();
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
    await page.goto(gatherUrl);

    await expect(page.getByRole('region', { name: 'Gather Information procedure flow' })).toBeVisible();
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
    await page.goto('/search?q=gather');
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Procedure Gather Information in Ironsworn' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'ipad-portrait', width: 820, height: 1180 },
  { name: 'ipad-landscape', width: 1180, height: 820 },
]) {
  test(`${viewport.name} centers all fixture spines with symmetric rail gutters`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const url of [gatherUrl, actionUrl, priceUrl]) {
      await page.goto(url);
      await expectCenteredRailGeometry(page);
      await expect(page.locator('[data-flow-node-type="decision"] [data-flow-decision-branches]').first())
        .toBeVisible();
      await expect(page.locator('[data-flow-node-type="decision"]').first()).toHaveCSS('clip-path', 'none');
    }
  });
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844, expectedWidth: 390 },
  { name: 'ipad-landscape', width: 1180, height: 820, expectedWidth: 400 },
]) {
  test(`${viewport.name} uses the intended Momentum reference sheet width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(gatherUrl);
    await page.getByRole('link', { name: /^Momentum/ }).click();

    const sheet = await page.getByRole('dialog', { name: 'Momentum' }).boundingBox();
    expect(Math.round(sheet?.width ?? 0)).toBe(viewport.expectedWidth);
  });
}
