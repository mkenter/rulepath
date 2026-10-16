import type { ContentSources } from '../../src/content/load-content';

export const fixtureSources: ContentSources = {
  games: import.meta.glob<string>('./clockwork/game.yaml', { eager: true, import: 'default', query: '?raw' }),
  procedures: import.meta.glob<string>('./clockwork/procedures/*.yaml', { eager: true, import: 'default', query: '?raw' }),
  references: import.meta.glob<string>('./clockwork/reference/*.yaml', { eager: true, import: 'default', query: '?raw' }),
  crosslinks: import.meta.glob<string>('./clockwork/crosslinks.yaml', { eager: true, import: 'default', query: '?raw' }),
};

export const productionSources: ContentSources = {
  games: import.meta.glob<string>('../../content/*/game.yaml', { eager: true, import: 'default', query: '?raw' }),
  procedures: import.meta.glob<string>('../../content/*/procedures/*.yaml', { eager: true, import: 'default', query: '?raw' }),
  references: import.meta.glob<string>('../../content/*/reference/*.yaml', { eager: true, import: 'default', query: '?raw' }),
  crosslinks: import.meta.glob<string>('../../content/*/crosslinks.yaml', { eager: true, import: 'default', query: '?raw' }),
};

export const combinedSources: ContentSources = {
  games: { ...productionSources.games, ...fixtureSources.games },
  procedures: { ...productionSources.procedures, ...fixtureSources.procedures },
  references: { ...productionSources.references, ...fixtureSources.references },
  crosslinks: { ...productionSources.crosslinks, ...fixtureSources.crosslinks },
};
