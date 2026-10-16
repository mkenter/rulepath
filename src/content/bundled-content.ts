import { loadContentRegistry } from './load-content';

export const contentRegistry = loadContentRegistry({
  games: import.meta.glob<string>('../../content/*/game.yaml', { eager: true, import: 'default', query: '?raw' }),
  procedures: import.meta.glob<string>('../../content/*/procedures/*.yaml', { eager: true, import: 'default', query: '?raw' }),
  references: import.meta.glob<string>('../../content/*/reference/*.yaml', { eager: true, import: 'default', query: '?raw' }),
  crosslinks: import.meta.glob<string>('../../content/*/crosslinks.yaml', { eager: true, import: 'default', query: '?raw' }),
});
