import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './AppRoutes';

const gatherUrl = '/games/ironsworn/procedures/gather-information';
function renderRoute(route: string) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], { initialEntries: [route] });
  return { router, ...render(<RouterProvider router={router} />) };
}

// Fixed source text, authored node labels, and the Gather → Price → Oracle chain.
describe('Ironsworn authored application regressions', () => {
  it('opens the Ironsworn library entry and exposes all canonical resources', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    expect(screen.getByRole('link', { name: 'Rulepath library' })).toBeInTheDocument();
    expect(document.title).toBe('Library | Rulepath');
    await user.click(within(screen.getByRole('region', { name: 'Games' })).getAllByRole('link').find(link => link.getAttribute('href') === '/games/ironsworn')!);
    expect(screen.getByRole('heading', { name: 'Ironsworn' })).toBeInTheDocument();
    const contents = screen.getByRole('navigation', { name: 'Ironsworn contents' });
    expect(within(contents).getAllByRole('link')).toHaveLength(11);
    expect(within(contents).getByRole('link', { name: 'Gather Information' })).toHaveAttribute('href', gatherUrl);
  });
  it('renders semantic nodes and labeled connections without interactive decisions', () => {
    renderRoute(gatherUrl);
    const decision = screen.getByLabelText('Decision · read only: What is the action roll result?');
    expect(within(decision).queryByRole('button')).not.toBeInTheDocument();
    expect(decision.querySelectorAll('[data-flow-decision-branch]')).toHaveLength(3);
    expect(screen.getByLabelText('Start: Search, investigate, ask questions, or follow a track')).toBeInTheDocument();
    expect(screen.getByLabelText('End: Envision the discovery and continue the fiction')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Procedure connections' })).toHaveTextContent('Strong hit:');
    expect(screen.getByLabelText('Procedure link: Action Roll (+wits)')).toHaveTextContent('Action Roll (+wits)');
  });
  it('maintains nested invocation history, browser Back, and ancestor jumps', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute(gatherUrl);
    await user.click(within(screen.getByLabelText('Procedure link: Pay the Price')).getByRole('link'));
    await user.click(within(screen.getByLabelText(/Procedure link: Ask the Oracle/)).getByRole('link'));
    const path = screen.getByRole('navigation', { name: 'Invocation path' });
    expect(path).toHaveTextContent('Gather Information');
    expect(path).toHaveTextContent('Pay the Price');
    await router.navigate(-1);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Pay the Price' })).toBeInTheDocument());
    await user.click(within(screen.getByRole('navigation', { name: 'Invocation path' })).getByRole('link', { name: 'Gather Information' }));
    expect(router.state.location.pathname).toBe(gatherUrl);
    expect(screen.queryByRole('navigation', { name: 'Invocation path' })).not.toBeInTheDocument();
  });
  it('renders standalone references and source/license links', async () => {
    const user = userEvent.setup();
    renderRoute('/games/ironsworn/reference/credits');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('Source and license'));
    expect(screen.getByText('Copyright ©2018 Shawn Tomkin.')).toBeVisible();
    expect(screen.getByRole('link', { name: /Creative Commons Attribution 4.0/ })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
    expect(screen.getByRole('link', { name: 'Ironsworn System Reference Document' })).toHaveAttribute('href', 'https://docs.google.com/document/d/11ypqt6GfLuBhGDJuBGWKlHa-Ru48Tf3G_6zbrYKmXgY/edit');
    expect(screen.getByText('License; How to Provide Credit')).toBeVisible();
  });
});
