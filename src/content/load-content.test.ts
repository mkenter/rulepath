import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import { createSearchIndex, searchContent } from '../features/search/searchIndex';
import { combinedSources, fixtureSources, productionSources } from '../../tests/fixtures/sources';
import { loadContentRegistry, type ContentSources } from './load-content';
import { resolveSource } from './registry';

function changed(group: keyof ContentSources, path: string, source: string): ContentSources {
  return { ...combinedSources, [group]: { ...combinedSources[group], [path]: source } };
}

const fixtureGame = Object.keys(fixtureSources.games)[0]!;
const fixtureCrosslinks = Object.keys(fixtureSources.crosslinks)[0]!;
const fixtureProcedure = Object.keys(fixtureSources.procedures).find(name => name.endsWith('/gather-information.yaml'))!;

// The same maps that Vite discovers in production, with a separate test-only directory added.
describe('Clockwork and Ironsworn loading fixture regressions', () => {
  it('discovers, parses, and validates both directories through the production loader', () => {
    const registry = loadContentRegistry(combinedSources);
    expect(registry.games.map(game => game.details.id)).toEqual(expect.arrayContaining(['clockwork', 'ironsworn']));
    expect(loadContentRegistry(productionSources).getGame('ironsworn')).toBeDefined();
    expect(registry.getGame('clockwork')?.procedures.size).toBe(3);
    expect(registry.getGame('clockwork')?.references.size).toBe(1);
  });

  it('isolates shared IDs, graph and reference links, and source overrides by game', () => {
    const registry = loadContentRegistry(combinedSources);
    const clockwork = registry.getGame('clockwork')!;
    const ironsworn = registry.getGame('ironsworn')!;
    expect(registry.getProcedure('clockwork', 'gather-information')?.title).toBe('Gather Information');
    expect(registry.getProcedure('ironsworn', 'gather-information')).not.toBe(registry.getProcedure('clockwork', 'gather-information'));
    expect(registry.getReference('clockwork', 'momentum')?.title).toBe('Signal Glossary');
    expect(registry.getReference('ironsworn', 'momentum')?.title).toBe('Momentum');
    expect(clockwork.procedures.get('gather-information')?.nodes).toContainEqual(expect.objectContaining({ type: 'procedure', target: 'decode-signal' }));
    expect(clockwork.procedures.get('gather-information')?.references).toContain('momentum');
    expect(clockwork.references.get('momentum')?.related).toContainEqual({ procedure: 'decode-signal' });
    expect(clockwork.details.source.publication.title).toBe('Clockwork Lantern Test Rules');
    expect(ironsworn.details.source.publication.title).not.toBe(clockwork.details.source.publication.title);
    expect(resolveSource(clockwork.details.source, clockwork.procedures.get('decode-signal')!.source).licensing).toBe(clockwork.details.source.licensing);
    expect(resolveSource(clockwork.details.source, clockwork.references.get('momentum')!.source).licensing.license.name).toBe('Glossary Test License');
    expect(resolveSource(ironsworn.details.source, ironsworn.references.get('momentum')!.source).licensing.license.name).toContain('Creative Commons');
  });

  it('accepts decisions with more than three outcomes', () => {
    const procedure = loadContentRegistry(combinedSources).getProcedure('clockwork', 'momentum')!;
    expect(procedure.nodes).toContainEqual(expect.objectContaining({ id: 'color', type: 'decision' }));
    expect(procedure.edges.filter(edge => edge.from === 'color')).toHaveLength(4);
  });

  it('keeps same-ID procedures and references in distinct routes and search results', () => {
    const registry = loadContentRegistry(combinedSources);
    const procedure = registry.getProcedure('clockwork', 'momentum')!;
    const reference = registry.getReference('clockwork', 'momentum')!;
    expect(procedure.title).toBe('Calibrate Lantern');
    expect(reference.title).toBe('Signal Glossary');
    const index = createSearchIndex(registry);
    expect(searchContent(index, procedure.title, 'clockwork')).toContainEqual(expect.objectContaining({ kind: 'Procedure', path: '/games/clockwork/procedures/momentum' }));
    expect(searchContent(index, reference.title, 'clockwork')).toContainEqual(expect.objectContaining({ kind: 'Reference', path: '/games/clockwork/reference/momentum' }));
  });

  it('indexes both games, keeps matching titles distinct, and filters scope reversibly', () => {
    const index = createSearchIndex(loadContentRegistry(combinedSources));
    expect(index).toHaveLength(loadContentRegistry(combinedSources).games.reduce((count, game) => count + 1 + game.procedures.size + game.references.size, 0));
    expect(new Set(index.map(document => document.path)).size).toBe(index.length);
    const global = searchContent(index, 'Gather Information');
    const matchingPaths = global.filter(result => result.title === 'Gather Information').map(result => result.path);
    expect(matchingPaths).toContain('/games/clockwork/procedures/gather-information');
    expect(matchingPaths).toContain('/games/ironsworn/procedures/gather-information');
    expect(searchContent(index, 'Gather Information', 'clockwork').every(result => result.gameId === 'clockwork')).toBe(true);
    expect(searchContent(index, 'Gather Information', 'ironsworn').every(result => result.gameId === 'ironsworn')).toBe(true);
    expect(searchContent(index, 'copper archive').some(result => result.gameId === 'clockwork')).toBe(true);
    expect(searchContent(index, 'copper archive', 'ironsworn')).toEqual([]);
    expect(searchContent(index, 'Gather Information')).toEqual(global);
  });

  it('rejects malformed metadata with its source file', () => {
    const game = combinedSources.games[fixtureGame]!.replace('creator: Imaginary Workshop', 'creator: ""');
    expect(() => loadContentRegistry(changed('games', fixtureGame, game))).toThrow(/clockwork\/game.yaml: game.source.publication.creator/);
  });

  it('rejects broken graph targets and duplicate IDs within a game', () => {
    const source = combinedSources.procedures[fixtureProcedure]!;
    expect(() => loadContentRegistry(changed('procedures', fixtureProcedure, source.replace('target: decode-signal', 'target: absent')))).toThrow(/clockwork\/procedures\/gather-information: node "link" targets missing procedure "absent"/);
    const duplicate = { ...combinedSources, procedures: { ...combinedSources.procedures, './clockwork/procedures/copy.yaml': source } };
    expect(() => loadContentRegistry(duplicate)).toThrow(/clockwork: duplicate procedure ID "gather-information"/);
  });

  it('rejects invalid crosslinks and missing manifests', () => {
    expect(() => loadContentRegistry(changed('crosslinks', fixtureCrosslinks, 'gather-information: [missing]\ndecode-signal: []\n'))).toThrow(/clockwork: procedure "gather-information" declares \[missing\] but links \[decode-signal\]/);
    const { [fixtureCrosslinks]: _removed, ...crosslinks } = combinedSources.crosslinks;
    expect(() => loadContentRegistry({ ...combinedSources, crosslinks })).toThrow(/clockwork: missing crosslinks.yaml/);
    const { [fixtureGame]: _missing, ...games } = combinedSources.games;
    expect(() => loadContentRegistry({ ...combinedSources, games })).toThrow(/clockwork: missing game.yaml/);
  });

  it('rejects a manifest whose ID differs from its directory', () => {
    const game = combinedSources.games[fixtureGame]!.replace('id: clockwork', 'id: other-game');
    expect(() => loadContentRegistry(changed('games', fixtureGame, game))).toThrow(/game ID "other-game" does not match directory "clockwork"/);
  });

  it('rejects duplicate game IDs across directories', () => {
    const game = combinedSources.games[fixtureGame]!;
    const duplicate = { ...combinedSources,
      games: { ...combinedSources.games, './another/game.yaml': game },
      crosslinks: { ...combinedSources.crosslinks, './another/crosslinks.yaml': stringify({}) },
    };
    expect(() => loadContentRegistry(duplicate)).toThrow(/duplicate game ID "clockwork"/);
  });
});
