import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { loadContentRegistry } from '../../content/load-content';
import { fixtureSources } from '../../../tests/fixtures/sources';
import { testRegisteredGameRoutes } from '../../../tests/registered-game-routes';
import { testApplicationInteractions } from '../../../tests/application-interactions';

vi.mock('../../content/bundled-content', () => ({ contentRegistry: registry }));
const registry = loadContentRegistry(fixtureSources);
const { AppRoutes } = await import('./AppRoutes');

function renderRoute(route: string) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], { initialEntries: [route] });
  return { router, ...render(<RouterProvider router={router} />) };
}

// The generic contracts must also pass when no production game is registered.
testRegisteredGameRoutes(registry, renderRoute);
testApplicationInteractions(registry, renderRoute);
