import { expect, it } from 'vitest';

import { productionSources } from '../../tests/fixtures/sources';
import { contentRegistry } from './bundled-content';
import { loadContentRegistry } from './load-content';

it('bundles every production game and resource through Vite raw imports', () => {
  expect(contentRegistry.games).toEqual(loadContentRegistry(productionSources).games);
});
