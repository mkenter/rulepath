import { describe, expect, it } from 'vitest';

import { combinedSources, fixtureSources } from '../../tests/fixtures/sources';
import { createSearchIndex, searchContent } from '../features/search/searchIndex';
import { contentRegistry } from './bundled-content';
import { loadContentRegistry } from './load-content';
import { resolveSource } from './registry';

// Both registries pass through the shared loader's schema, graph, and crosslink validation.
describe.each([
  { name: 'production content', registry: contentRegistry },
  { name: 'production content with a synthetic game', registry: loadContentRegistry(combinedSources) },
  { name: 'replacement library with only synthetic content', registry: loadContentRegistry(fixtureSources) },
])('$name', ({ registry }) => {
  const index = createSearchIndex(registry);

  it('registers unique games and canonical search paths', () => {
    expect(registry.games.length).toBeGreaterThan(0);
    const ids = registry.games.map(game => game.details.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(index).toHaveLength(registry.games.reduce((count, game) => count + 1 + game.procedures.size + game.references.size, 0));
    expect(new Set(index.map(document => document.path)).size).toBe(index.length);
  });

  describe.each(registry.games.map(game => ({ id: game.details.id, game })))('$id', ({ game, id }) => {
    const prefix = `/games/${id}`;
    const resources = [
      ...[...game.procedures.values()].map(resource => ({ resource, path: `${prefix}/procedures/${resource.id}` })),
      ...[...game.references.values()].map(resource => ({ resource, path: `${prefix}/reference/${resource.id}` })),
    ];

    it('covers every resource exactly once in sections and resolves links within its game', () => {
      expect(registry.getGame(id)).toBe(game);
      const listed = game.sections.flatMap(section => section.items.map(item => {
        if ('procedure' in item) {
          expect(registry.getProcedure(id, item.procedure)).toBeDefined();
          return `${prefix}/procedures/${item.procedure}`;
        }
        expect(registry.getReference(id, item.reference)).toBeDefined();
        return `${prefix}/reference/${item.reference}`;
      }));
      expect(listed.sort()).toEqual(resources.map(({ path }) => path).sort());
      for (const procedure of game.procedures.values()) {
        expect(registry.getProcedure(id, procedure.id)).toBe(procedure);
        for (const node of procedure.nodes) {
          if (node.type === 'procedure') expect(registry.getProcedure(id, node.target)).toBe(game.procedures.get(node.target));
        }
        for (const target of procedure.related) expect(registry.getProcedure(id, target)).toBeDefined();
        for (const target of procedure.references) expect(registry.getReference(id, target)).toBeDefined();
      }
      for (const reference of game.references.values()) {
        expect(registry.getReference(id, reference.id)).toBe(reference);
        for (const target of reference.related) {
          expect('procedure' in target ? registry.getProcedure(id, target.procedure) : registry.getReference(id, target.reference)).toBeDefined();
        }
      }
    });

    it('keeps lookups isolated and resolves source groups and overrides independently', () => {
      for (const { resource } of resources) {
        const source = resolveSource(game.details.source, resource.source);
        expect(source.publication).toBe(resource.source.overrides?.publication ?? game.details.source.publication);
        expect(source.licensing).toBe(resource.source.overrides?.licensing ?? game.details.source.licensing);
        expect(source.section).toBe(resource.source.section);
        for (const other of registry.games) {
          expect(registry.getProcedure(other.details.id, resource.id)).toBe(other.procedures.get(resource.id));
          expect(registry.getReference(other.details.id, resource.id)).toBe(other.references.get(resource.id));
        }
      }
    });

    it('indexes the game and every resource, with scoped results matching global results for that game', () => {
      const documents = [{ title: game.details.title, path: prefix }, ...resources.map(({ resource, path }) => ({ title: resource.title, path }))];
      for (const { title, path } of documents) {
        expect(index).toContainEqual(expect.objectContaining({ gameId: id, path, title }));
        const global = searchContent(index, title);
        const scoped = searchContent(index, title, id);
        expect(global).toContainEqual(expect.objectContaining({ gameId: id, path }));
        expect(scoped).toEqual(global.filter(result => result.gameId === id));
        expect(scoped).toContainEqual(expect.objectContaining({ gameId: id, path }));
      }
    });
  });
});
