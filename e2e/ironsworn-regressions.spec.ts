import { expect, test, type Page } from '@playwright/test';

// These integration fixtures intentionally protect Ironsworn's authored chain and rail topology,
// its dense six-reference index, and sample attribution. Generic contracts live separately.
const gatherUrl = '/games/ironsworn/procedures/gather-information';
const actionUrl = '/games/ironsworn/procedures/action-roll';
const priceUrl = '/games/ironsworn/procedures/pay-the-price';
const gather = gatherUrl;
const price = priceUrl;

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

test.describe('Ironsworn authored integration and geometry regressions', () => {
  test('game home prioritizes procedures with neutral identity and responsive reference navigation', async ({
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
    await expect(gameHome).toHaveCSS('background-color', 'rgb(247, 247, 250)');
    await expect(titleZone).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const jumpNav = page.getByRole('navigation', { name: 'On this page', exact: true });
    await expect(jumpNav).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(jumpNav).toHaveCSS('border-top-width', '1px');
    const sectionColumns = page.locator('[data-game-home-sections]');
    const mainRegion = sectionColumns.locator(':scope > div').first();
    const referenceRegion = sectionColumns.locator(':scope > div').last();
    await expect(referenceRegion).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(referenceRegion).toHaveCSS('border-left-width', '0px');
    const mainBox = (await mainRegion.boundingBox())!;
    const referenceBox = (await referenceRegion.boundingBox())!;
    expect(referenceBox.y).toBeGreaterThanOrEqual(mainBox.y + mainBox.height);
    expect(Math.abs(referenceBox.x - mainBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(mainBox.width - referenceBox.width)).toBeLessThanOrEqual(1);
    await expect(mainRegion).toContainText('2 procedures');
    await expect(referenceRegion).toContainText('6 references');

    const restBackground = await procedure.evaluate((element) =>
      getComputedStyle(element).backgroundColor,
    );
    await procedure.hover();
    await expect(procedure).not.toHaveCSS('background-color', restBackground);
    const hoverBackground = await procedure.evaluate((element) => getComputedStyle(element).backgroundColor);

    await page.mouse.down();
    await expect(procedure).not.toHaveCSS('background-color', hoverBackground);
    await page.mouse.move(0, 0);
    await page.mouse.up();

    await procedure.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(procedure).toBeFocused();
    await expect(procedure).toHaveCSS('outline-style', 'solid');
    await expect(procedure).toHaveCSS('outline-width', '2px');
    await expect(procedure).toHaveCSS('outline-color', 'rgb(181, 54, 39)');

    for (const target of [procedure, reference]) {
      const box = await target.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const phoneMain = (await mainRegion.boundingBox())!;
    const phoneReferences = (await referenceRegion.boundingBox())!;
    expect(phoneReferences.y).toBeGreaterThanOrEqual(phoneMain.y + phoneMain.height);
    expect(Math.abs(phoneReferences.width - phoneMain.width)).toBeLessThanOrEqual(1);
    const sectionJump = page.getByRole('navigation', { name: 'On this page', exact: true });
    await sectionJump.getByRole('link', { name: 'References', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'References', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  async function nested(page: Page) {
    await page.goto(gather);
    await page.getByLabel('Procedure link: Pay the Price', { exact: true }).getByRole('link').click();
    await page.getByLabel(/Procedure link: Ask the Oracle/).getByRole('link').click();
  }

  test('nested links preserve browser Back and trim ancestry on ancestor jumps', async ({ page }) => {
    await nested(page);
    const path = page.getByRole('navigation', { name: 'Invocation path' });
    await expect(path).toContainText('Gather Information');
    await expect(path).toContainText('Pay the Price');
    await page.goBack();
    await expect(page).toHaveURL(price);
    await page.goBack();
    await expect(page).toHaveURL(gather);
    await nested(page);
    await path.getByRole('link', { name: 'Gather Information' }).click();
    await expect(page).toHaveURL(gather);
    await expect(path).toHaveCount(0);
  });

  test('phone controls expose the immediate parent and full ancestor path', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await nested(page);
    await expect(page.getByRole('navigation', { name: 'Invocation path' })).toBeHidden();
    const controls = page.getByRole('navigation', { name: 'Procedure path controls' });
    await expect(controls.getByRole('link', { name: 'Pay the Price' }).first()).toBeVisible();
    await controls.getByLabel('Open full invocation path').click();
    const sheet = controls.locator('[data-path-sheet]');
    await expect(sheet).toBeVisible();
    await sheet.getByRole('link', { name: 'Gather Information' }).click();
    await expect(page).toHaveURL(gather);
  });

  test('attribution and license links are available in the production app', async ({ page }) => {
    await page.goto('/games/ironsworn/reference/credits');
    await page.getByText('Source and license').click();
    await expect(page.getByText('Copyright ©2018 Shawn Tomkin.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Creative Commons Attribution 4.0/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Creative Commons Attribution 4.0/ })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
    await expect(page.getByRole('link', { name: 'Ironsworn System Reference Document' })).toHaveAttribute('href', 'https://docs.google.com/document/d/11ypqt6GfLuBhGDJuBGWKlHa-Ru48Tf3G_6zbrYKmXgY/edit');
  });

  test('every sample resource is reachable and fits a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/games/ironsworn');
    const paths = await page.getByRole('navigation', { name: 'Ironsworn contents' }).getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!));
    expect(paths).toHaveLength(11);
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.getByText('Source and license').click();
      await expect(page.getByRole('link', { name: /Creative Commons Attribution 4.0/ })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ironsworn System Reference Document' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    }
  });
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

});
