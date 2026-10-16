import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { loadContentRegistry } from '../../content/load-content';
import { combinedSources } from '../../../tests/fixtures/sources';
import { testRegisteredGameRoutes } from '../../../tests/registered-game-routes';

vi.mock('../../content/bundled-content', () => ({ contentRegistry: registry }));
const registry = loadContentRegistry(combinedSources);
const { AppRoutes } = await import('./AppRoutes');

function renderRoute(route: string) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], { initialEntries: [route] });
  return { router, ...render(<RouterProvider router={router} />) };
}

testRegisteredGameRoutes(registry, renderRoute);

describe('multi-game application routes', () => {
  it('lists both games and resolves each section to its own resources', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    expect(within(screen.getByRole('region', { name: 'Games' })).getAllByRole('link').find(link => link.getAttribute('href') === '/games/ironsworn')!).toHaveAttribute('href', '/games/ironsworn');
    await user.click(within(screen.getByRole('region', { name: 'Games' })).getAllByRole('link').find(link => link.getAttribute('href') === '/games/clockwork')!);
    const contents = screen.getByRole('navigation', { name: 'Clockwork Lantern contents' });
    expect(within(contents).getAllByRole('link')).toHaveLength(4);
    expect(within(contents).getByRole('link', { name: 'Gather Information' })).toHaveAttribute('href', '/games/clockwork/procedures/gather-information');
    expect(within(contents).getByRole('link', { name: 'Signal Glossary' })).toHaveAttribute('href', '/games/clockwork/reference/momentum');
  });

  it('resolves direct URLs and follows procedure and reference links within the game', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/games/clockwork/procedures/gather-information');
    expect(screen.getByRole('heading', { name: 'Gather Information' })).toBeInTheDocument();
    expect(screen.getByText('Inspect a fictional copper archive for a signal.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clockwork Lantern' })).toHaveAttribute('href', '/games/clockwork');
    await user.click(within(screen.getByLabelText('Procedure link: Decode the signal strip.')).getByRole('link'));
    expect(router.state.location.pathname).toBe('/games/clockwork/procedures/decode-signal');
    await user.click(screen.getByRole('link', { name: 'Signal Glossary' }));
    expect(router.state.location.pathname).toBe('/games/clockwork/reference/momentum');
    expect(screen.getByRole('dialog', { name: 'Signal Glossary' })).toBeInTheDocument();
  });

  it('keeps same-ID references distinct and shows each game’s own provenance', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/games/clockwork/reference/momentum');
    expect(screen.getByRole('heading', { name: 'Signal Glossary' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Decode Signal' })).toHaveAttribute('href', '/games/clockwork/procedures/decode-signal');
    await user.click(screen.getByText('Source and license'));
    expect(screen.getByText('Copyright 2026 Imaginary Glossary Editor (fictional)')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Clockwork Lantern Test Rules' })).toHaveAttribute('href', 'https://example.com/clockwork-rules');
    await router.navigate('/games/ironsworn/reference/momentum');
    expect(await screen.findByRole('heading', { name: 'Momentum' })).toBeInTheDocument();
  });

  it('opens same-ID resources by type and follows the reference link without ambiguity', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/games/clockwork/procedures/momentum');
    expect(screen.getByRole('heading', { name: 'Calibrate Lantern' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Signal Glossary' }));
    expect(router.state.location.pathname).toBe('/games/clockwork/reference/momentum');
    expect(screen.getByRole('dialog', { name: 'Signal Glossary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Calibrate Lantern' })).toBeInTheDocument();
  });

  it.each(['/games/unknown', '/games/clockwork/procedures/unknown', '/games/clockwork/reference/unknown'])('preserves not-found behavior for %s', route => {
    renderRoute(route);
    expect(screen.getByRole('heading', { name: 'That rules entry is not in this library' })).toBeInTheDocument();
  });

  it('shows both matching titles globally, filters by game, and restores global results', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/search?q=Gather%20Information');
    expect(screen.getByRole('link', { name: 'Procedure Gather Information in Clockwork Lantern' })).toHaveAttribute('href', '/games/clockwork/procedures/gather-information');
    expect(screen.getByRole('link', { name: 'Procedure Gather Information in Ironsworn' })).toHaveAttribute('href', '/games/ironsworn/procedures/gather-information');
    await router.navigate('/search?game=clockwork&q=Gather%20Information');
    expect(screen.getByRole('link', { name: 'Procedure Gather Information in Clockwork Lantern' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Procedure Gather Information in Ironsworn' })).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Remove Clockwork Lantern filter and search all games' }));
    expect(screen.getByRole('link', { name: 'Procedure Gather Information in Ironsworn' })).toBeInTheDocument();
  });
});
