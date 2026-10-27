import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { ContentRegistry } from '../src/content/registry';
import { resolveSource } from '../src/content/registry';

// Exercise shared route rendering once per resource type; content validation covers the dataset.
export function testRegisteredGameRoutes(registry: ContentRegistry, renderRoute: (route: string) => unknown) {
  describe.each(registry.games.map(game => ({ id: game.details.id, game })))('registered game routes: $id', ({ id, game }) => {
    const home = `/games/${id}`;
    const resources = [
      ...[...game.procedures.values()].map(resource => ({ resource, path: `${home}/procedures/${resource.id}` })),
      ...[...game.references.values()].map(resource => ({ resource, path: `${home}/reference/${resource.id}` })),
    ];

    it('appears in the library and opens its own contents', async () => {
      const user = userEvent.setup();
      renderRoute('/');
      const games = screen.getByRole('region', { name: 'Games' });
      const link = within(games).getAllByRole('link').find(link => link.getAttribute('href') === home)!;
      expect(link).toHaveTextContent(game.details.title);
      await user.click(link);
      expect(screen.getByRole('heading', { level: 1, name: game.details.title })).toBeInTheDocument();
      const contents = screen.getByRole('navigation', { name: `${game.details.title} contents` });
      expect(within(contents).queryAllByRole('link').map(link => link.getAttribute('href')).sort()).toEqual(resources.map(({ path }) => path).sort());
    });

    const representatives = [
      resources.find(({ resource }) => 'nodes' in resource),
      resources.find(({ resource }) => !('nodes' in resource)),
    ].filter((entry): entry is (typeof resources)[number] => Boolean(entry));
    for (const { resource, path } of representatives) {
      it(`opens ${path} directly with the right game, links, and attribution`, async () => {
        const user = userEvent.setup();
        const source = resolveSource(game.details.source, resource.source);
        renderRoute(path);
        expect(screen.getByRole('heading', { level: 1, name: resource.title })).toBeInTheDocument();
        const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
        expect(within(breadcrumb).getAllByRole('link', { name: game.details.title }).map(link => link.getAttribute('href'))).toContain(home);
        const resourceLinks = screen.getAllByRole('link').map(link => link.getAttribute('href')).filter(href =>
          href?.startsWith('/games/') && (href.includes('/procedures/') || href.includes('/reference/')),
        );
        for (const href of resourceLinks) expect(resources.map(({ path }) => path)).toContain(href);
        const expectedLinks = 'nodes' in resource ? [
          ...resource.nodes.flatMap(node => node.type === 'procedure' ? [`${home}/procedures/${node.target}`] : []),
          ...resource.related.map(id => `${home}/procedures/${id}`),
          ...resource.references.map(id => `${home}/reference/${id}`),
        ] : resource.related.map(target => 'procedure' in target ? `${home}/procedures/${target.procedure}` : `${home}/reference/${target.reference}`);
        for (const href of expectedLinks) expect(resourceLinks).toContain(href);
        await user.click(screen.getByText('Source and license'));
        expect(screen.getAllByRole('link', { name: source.publication.title }).map(link => link.getAttribute('href'))).toContain(source.publication.url);
        expect(screen.getAllByRole('link', { name: source.licensing.license.name }).map(link => link.getAttribute('href'))).toContain(source.licensing.license.url);
        expect(screen.getByText(source.licensing.copyright)).toBeVisible();
      });
    }
  });
}
