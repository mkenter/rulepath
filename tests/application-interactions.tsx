import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { ContentRegistry } from '../src/content/registry';
import { contentScenarios, unusedId } from './content-scenarios';

type RenderRoute = (route: string) => { router: ReturnType<typeof createMemoryRouter>; container: HTMLElement };

// Run against production and a fixture-only replacement library, with identical assertions.
export function testApplicationInteractions(registry: ContentRegistry, renderRoute: RenderRoute) {
  const scenarios = contentScenarios(registry);
  const procedure = scenarios.procedures[0]!;
  const linked = scenarios.procedureLinks[0]!;
  const reference = scenarios.referenceLinks[0]!;
  const game = registry.games[0]!;

  describe('generic application interactions', () => {
    it('presents the library identity and page title', () => {
      renderRoute('/');
      expect(screen.getByRole('link', { name: 'Rulepath library' })).toBeInTheDocument();
      expect(document.title).toBe('Library | Rulepath');
    });

    it.skipIf(!procedure)('does not fabricate ancestry at a direct procedure URL', () => {
      renderRoute(procedure.path);
      expect(screen.queryByRole('navigation', { name: 'Invocation path' })).not.toBeInTheDocument();
    });

    it.skipIf(!linked)('tracks a procedure invocation, Back, and an ancestor jump', async () => {
      const user = userEvent.setup();
      const { router, container } = renderRoute(linked.path);
      const follow = () => user.click(within(container.querySelector<HTMLElement>(`[data-flow-node-id="${linked.node.id}"]`)!).getByRole('link'));
      await follow();
      expect(router.state.location.pathname).toBe(linked.targetPath);
      expect(screen.getByRole('navigation', { name: 'Invocation path' })).toHaveTextContent(linked.procedure.title);
      await router.navigate(-1);
      await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: linked.procedure.title })).toBeInTheDocument());
      await follow();
      const path = screen.getByRole('navigation', { name: 'Invocation path' });
      await user.click(within(path).getAllByRole('link').find(link => link.getAttribute('href') === linked.path)!);
      expect(router.state.location.pathname).toBe(linked.path);
      expect(screen.queryByRole('navigation', { name: 'Invocation path' })).not.toBeInTheDocument();
    });

    it.skipIf(!reference)('contains modal focus, closes with Escape or its button, and supports Back', async () => {
      const user = userEvent.setup();
      const { router } = renderRoute(reference.path);
      const link = screen.getAllByRole('link').find(link => link.getAttribute('href') === reference.referencePath)!;
      await user.click(link);
      const dialog = screen.getByRole('dialog', { name: reference.reference.title });
      const close = within(dialog).getByRole('button', { name: `Close ${reference.reference.title}` });
      expect(screen.getByRole('heading', { level: 1, name: reference.procedure.title })).toBeInTheDocument();
      expect(close).toHaveFocus();
      expect(document.querySelector('[data-route-content]')).toHaveAttribute('inert');
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(within(dialog).getByText('Source and license')).toHaveFocus();
      await user.keyboard('{Tab}');
      expect(close).toHaveFocus();
      await user.click(within(dialog).getByText('Source and license'));
      close.focus();
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(within(dialog).getAllByRole('link').at(-1)).toHaveFocus();
      await user.keyboard('{Tab}');
      expect(close).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(link).toHaveFocus();
      expect(router.state.location.pathname).toBe(reference.path);
      await user.click(link);
      await user.click(screen.getByRole('button', { name: `Close ${reference.reference.title}` }));
      expect(router.state.location.pathname).toBe(reference.path);
      await user.click(link);
      await router.navigate(-1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    const missingGame = unusedId(registry.games.map(game => game.details.id));
    const missingResource = unusedId([...game.procedures.keys(), ...game.references.keys()]);
    it.each([
      `/games/${missingGame}`, `/games/${game.details.id}/procedures/${missingResource}`,
      `/games/${game.details.id}/reference/${missingResource}`, '/missing',
    ])('handles unknown route %s', route => {
      renderRoute(route);
      expect(screen.getByRole('heading', { name: 'That rules entry is not in this library' })).toBeInTheDocument();
    });

    it('opens scoped search, removes the scope, and clears and refocuses the query', async () => {
      const user = userEvent.setup();
      const selectedGame = procedure?.game ?? game;
      const query = procedure?.procedure.title ?? game.details.title;
      const resultPath = procedure?.path ?? `/games/${game.details.id}`;
      const { router } = renderRoute(resultPath);
      await user.click(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('link', { name: 'Search' }));
      expect(router.state.location.search).toBe(`?game=${selectedGame.details.id}`);
      const input = screen.getByRole('searchbox');
      await user.type(input, query);
      expect(within(screen.getByRole('region', { name: /^\d+ results?$/ })).getAllByRole('link').map(link => link.getAttribute('href'))).toContain(resultPath);
      await user.click(screen.getByRole('button', { name: `Remove ${selectedGame.details.title} filter and search all games` }));
      expect(router.state.location.search).toBe(`?${new URLSearchParams({ q: query })}`);
      await user.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(input).toHaveValue('');
      expect(input).toHaveFocus();
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });

    it.skipIf(!procedure)('ignores the removed developer flag and preserves the canonical graph', () => {
      const { container } = renderRoute(`${procedure.path}?rail-stress=1`);
      expect(container.querySelectorAll('[data-flow-node-id]')).toHaveLength(procedure.procedure.nodes.length);
      expect(within(screen.getByRole('list', { name: 'Procedure connections' })).getAllByRole('listitem')).toHaveLength(procedure.procedure.edges.length);
      expect(screen.queryByLabelText('Synthetic developer fixture')).not.toBeInTheDocument();
    });
  });
}
