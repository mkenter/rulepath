import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';
import { contentRegistry } from '../../content/bundled-content';
import { testRegisteredGameRoutes } from '../../../tests/registered-game-routes';

function renderRoute(route: string) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], { initialEntries: [route] });
  return { router, ...render(<RouterProvider router={router} />) };
}

testRegisteredGameRoutes(contentRegistry, renderRoute);
