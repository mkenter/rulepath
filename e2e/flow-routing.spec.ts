import { expect, test } from '@playwright/test';
import { registry } from './support/content';

// These graphs exercise nested bypasses, joins, and shared forward/return gutters.
// Keep actual browser measurements: jsdom cannot expose connector collisions.
const graphs = [
  ['ironsworn', 'gather-information'],
  ['ironsworn', 'action-roll'],
  ['ironsworn', 'pay-the-price'],
  ['cairn-2e', 'combat'],
] as const;

for (const width of [390, 1180]) {
  test(`${width}px connectors avoid nodes, conflicting lanes, and shared ports`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const [game, id] of graphs) {
      await test.step(`${game}/${id}`, async () => {
        const procedure = registry.getProcedure(game, id)!;
        await page.goto(`/games/${game}/procedures/${id}`);
        await page.evaluate(() => document.fonts.ready);
        const routes = page.locator('[data-route-kind]');
        const connections = new Set(procedure.edges.map(edge => `${edge.from}:${edge.to}`));
        await expect(routes).toHaveCount(connections.size);

        // SVG APIs measure the rendered paths without depending on path command syntax.
        const geometry = await page.locator('[data-flow-list]').evaluate(list => {
          const nodes = [...list.querySelectorAll<HTMLElement>('[data-flow-node-id]')].map(item => ({
            id: item.dataset.flowNodeId!,
            bounds: item.querySelector<HTMLElement>('[data-flow-node]')!.getBoundingClientRect(),
          }));
          const columnLeft = Math.min(...nodes.map(node => node.bounds.left));
          const columnRight = Math.max(...nodes.map(node => node.bounds.right));
          const paths = [...list.querySelectorAll<SVGGElement>('[data-route-kind]')].map(group => {
            const path = group.querySelector<SVGPathElement>('[data-flow-connector-route]')!;
            const matrix = path.getScreenCTM()!;
            const length = path.getTotalLength();
            const point = (distance: number) => path.getPointAtLength(distance).matrixTransform(matrix);
            const box = path.getBBox();
            const sampleCount = Math.max(1, Math.ceil(length / 3));
            const side = group.dataset.routeDirection === 'left' ? 'left' : 'right';
            return {
              key: `${group.dataset.edgeFrom}:${group.dataset.edgeTo}`,
              from: group.dataset.edgeFrom!, to: group.dataset.edgeTo!,
              side, kind: group.dataset.routeKind!,
              rail: new DOMPoint(side === 'left' ? box.x : box.x + box.width, box.y).matrixTransform(matrix).x,
              start: point(0), end: point(length),
              samples: Array.from({ length: sampleCount + 1 }, (_, index) =>
                point(length * index / sampleCount)),
            };
          });
          const violations: string[] = [];
          for (const [index, node] of nodes.entries()) {
            const next = nodes[index + 1];
            if (next && node.bounds.bottom > next.bounds.top + 1) {
              violations.push(`${node.id} overlaps ${next.id}`);
            }
          }
          for (const path of paths) {
            for (const node of nodes) {
              const b = node.bounds;
              if (path.samples.some(p => p.x > b.left + 1 && p.x < b.right - 1 && p.y > b.top + 1 && p.y < b.bottom - 1)) {
                violations.push(`${path.key} crosses node ${node.id}`);
              }
            }
            if (path.kind === 'spine') continue;
            if (path.side === 'left' ? path.rail >= columnLeft : path.rail <= columnRight) {
              violations.push(`${path.key} rail overlaps the node column`);
            }
          }
          const rails = paths.filter(path => path.kind !== 'spine');
          for (const [index, a] of rails.entries()) {
            for (const b of rails.slice(index + 1)) {
              if (a.side !== b.side) continue;
              const aTop = Math.min(a.start.y, a.end.y), aBottom = Math.max(a.start.y, a.end.y);
              const bTop = Math.min(b.start.y, b.end.y), bBottom = Math.max(b.start.y, b.end.y);
              if (Math.max(aTop, bTop) <= Math.min(aBottom, bBottom) && Math.abs(a.rail - b.rail) < 1) {
                violations.push(`${a.key} and ${b.key} share an overlapping rail`);
              }
              const distance = (rail: number) => a.side === 'left' ? columnLeft - rail : rail - columnRight;
              const aFrom = nodes.findIndex(node => node.id === a.from), aTo = nodes.findIndex(node => node.id === a.to);
              const bFrom = nodes.findIndex(node => node.id === b.from), bTo = nodes.findIndex(node => node.id === b.to);
              const aRange = [Math.min(aFrom, aTo), Math.max(aFrom, aTo)];
              const bRange = [Math.min(bFrom, bTo), Math.max(bFrom, bTo)];
              if (aRange[0]! <= bRange[0]! && aRange[1]! >= bRange[1]! && distance(a.rail) <= distance(b.rail)) {
                violations.push(`${a.key} must pass outside ${b.key}`);
              }
              if (bRange[0]! <= aRange[0]! && bRange[1]! >= aRange[1]! && distance(b.rail) <= distance(a.rail)) {
                violations.push(`${b.key} must pass outside ${a.key}`);
              }
              for (const [aNode, aPort] of [[a.from, a.start], [a.to, a.end]] as const) {
                for (const [bNode, bPort] of [[b.from, b.start], [b.to, b.end]] as const) {
                  if (aNode === bNode && Math.abs(aPort.y - bPort.y) < 1) {
                    violations.push(`${a.key} and ${b.key} share a port on ${aNode}`);
                  }
                }
              }
            }
          }
          return { violations, keys: paths.map(path => path.key) };
        });
        expect(new Set(geometry.keys)).toEqual(connections);
        expect(geometry.violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }
  });
}

test('pointer tracing emphasizes one decision route without adding decision controls', async ({ page }) => {
  await page.goto('/games/ironsworn/procedures/action-roll');
  const branch = page.locator('[data-flow-decision-branch]').first();
  const route = await branch.getAttribute('data-route-key');
  await branch.hover();
  const emphasized = page.locator('[data-route-kind][data-emphasized]');
  await expect(emphasized).toHaveCount(1);
  const [from, to] = route!.split(':');
  await expect(emphasized).toHaveAttribute('data-edge-from', from!);
  await expect(emphasized).toHaveAttribute('data-edge-to', to!);
  await expect(page.locator('[data-flow-node-type="decision"] a, [data-flow-node-type="decision"] button')).toHaveCount(0);
  await page.getByRole('heading', { level: 1 }).hover();
  await expect(emphasized).toHaveCount(0);

  await page.goto('/games/ironsworn/procedures/gather-information');
  const linkNode = page.getByLabel('Procedure link: Pay the Price', { exact: true });
  await linkNode.getByRole('link').focus();
  await expect(page.locator('[data-route-kind][data-emphasized]').first()).toBeAttached();
});
