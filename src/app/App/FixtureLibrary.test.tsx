import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { loadContentRegistry } from '../../content/load-content';
import { fixtureSources } from '../../../tests/fixtures/sources';
import { testRegisteredGameRoutes } from '../../../tests/registered-game-routes';
import { contentScenarios, unusedId } from '../../../tests/content-scenarios';

vi.mock('../../content/bundled-content', () => ({ contentRegistry: registry }));
const registry = loadContentRegistry(fixtureSources);
const { AppRoutes } = await import('./AppRoutes');

function renderRoute(route: string) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], { initialEntries: [route] });
  return { router, ...render(<RouterProvider router={router} />) };
}

// The generic contracts must also pass when no production game is registered.
testRegisteredGameRoutes(registry, renderRoute);

it.each(['page', 'sheet'])('renders structured reference content in a %s', async presentation => {
  const user = userEvent.setup();
  if (presentation === 'sheet') {
    renderRoute('/games/clockwork/procedures/momentum');
    await user.click(screen.getByRole('link', { name: 'Signal Glossary' }));
  } else {
    renderRoute('/games/clockwork/reference/momentum');
  }
  const table = screen.getByRole('table', { name: 'Signal meanings' });
  expect(within(table).getByRole('columnheader', { name: 'Mark' })).toHaveAttribute('scope', 'col');
  expect(within(table).getByRole('columnheader', { name: 'Meaning' })).toHaveAttribute('scope', 'col');
  expect(within(table).getByRole('row', { name: 'Copper spiral Safe passage' })).toBeVisible();
  expect(within(table).getByRole('row', { name: 'Broken ring Return to the archive' })).toBeVisible();
  expect(screen.getByText('Read each mark from left to right.')).toBeVisible();
  expect(screen.getByText('Repeat a faint signal before decoding.')).toBeVisible();
});

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

  it('does not fabricate ancestry at a direct procedure URL', () => {
    renderRoute(procedure.path);
    expect(screen.queryByRole('navigation', { name: 'Invocation path' })).not.toBeInTheDocument();
  });

  it('tracks a procedure invocation, Back, and an ancestor jump', async () => {
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

  it('preserves procedure context when closing a sheet or going Back', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute(reference.path);
    const link = screen.getAllByRole('link').find(link => link.getAttribute('href') === reference.referencePath)!;
    await user.click(link);
    expect(screen.getByRole('dialog', { name: reference.reference.title })).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: reference.procedure.title })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
});
