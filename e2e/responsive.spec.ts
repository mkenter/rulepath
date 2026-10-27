import { expect, test } from '@playwright/test';
import { scenarios } from './support/content';

for (const width of [390, 820, 1440]) {
  test(`${width}px library, contents, procedures, and search stay usable without overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const entry = scenarios.decisions[0]!;
    const query = new URLSearchParams({ q: entry.procedure.title, game: entry.game.details.id });
    for (const route of ['/', `/games/${entry.game.details.id}`, entry.path, `/search?${query}`]) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
    }
    const result = page.getByRole('region', { name: /^\d+ results?$/ }).locator(`[href="${entry.path}"]`);
    await result.click();
    await expect(page).toHaveURL(entry.path);
  });
}

for (const width of [390, 1180]) {
  test(`${width}px structured references fit and scroll in pages and contextual sheets`, async ({ page }) => {
    const viewport = { width, height: 844 };
    await page.setViewportSize(viewport);
    // The longest available table exercises real scrolling without fixing an entry or row count.
    const entry = scenarios.referenceLinks.filter(entry => entry.reference.sections?.some(section => section.table))
      .sort((a, b) => (b.reference.sections?.reduce((sum, section) => sum + (section.table?.rows.length ?? 0), 0) ?? 0) -
        (a.reference.sections?.reduce((sum, section) => sum + (section.table?.rows.length ?? 0), 0) ?? 0))[0]!;
    const tableSection = entry.reference.sections!.find(section => section.table)!;
    for (const presentation of ['page', 'sheet']) {
      await page.goto(presentation === 'page' ? entry.referencePath : entry.path);
      if (presentation === 'sheet') await page.locator(`[href="${entry.referencePath}"]`).click();
      const content = presentation === 'sheet' ? page.getByRole('dialog', { name: entry.reference.title, exact: true }) : page.getByRole('main');
      const table = content.getByRole('table', { name: tableSection.heading, exact: true });
      await expect(table).toBeVisible();
      // Wide tables may scroll inside their focusable region, never the page or sheet.
      const scroller = content.getByRole('region', { name: tableSection.heading, exact: true }).and(content.locator('[tabindex]'));
      await scroller.focus();
      await expect(scroller).toBeFocused();
      await scroller.evaluate(element => { element.scrollLeft = element.scrollWidth; });
      expect(await scroller.evaluate(element => element.scrollLeft + element.clientWidth >= element.scrollWidth - 1)).toBe(true);
      if (presentation === 'sheet') {
        const bounds = (await content.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
        expect(await content.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        const close = content.getByRole('button', { name: `Close ${entry.reference.title}`, exact: true });
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
        const canReachEnd = await table.evaluate(element => {
          let ancestor = element.parentElement;
          while (ancestor) {
            if (ancestor.scrollHeight > ancestor.clientHeight) {
              ancestor.scrollTop = ancestor.scrollHeight;
              if (ancestor.scrollTop + ancestor.clientHeight < ancestor.scrollHeight - 1) return false;
            }
            if (ancestor.getAttribute('role') === 'dialog') break;
            ancestor = ancestor.parentElement;
          }
          return true;
        });
        expect(canReachEnd).toBe(true);
        await expect(content.getByText('Source and license', { exact: true })).toBeInViewport();
        // A successful click also checks that the close control is not obscured after scrolling.
        await close.click();
        await expect(content).toHaveCount(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}
