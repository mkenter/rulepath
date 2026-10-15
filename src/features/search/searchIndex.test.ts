import { describe, expect, it } from 'vitest';
import { contentRegistry } from '../../content/bundled-content';
import { createSearchIndex, searchContent } from './searchIndex';

const index = createSearchIndex(contentRegistry);
describe('local search index', () => {
  it('ranks exact titles before supporting-text matches', () => {
    expect(searchContent(index, 'Action Roll')[0]).toMatchObject({ kind: 'Procedure', path: '/games/ironsworn/procedures/action-roll' });
    expect(searchContent(index, 'Momentum')[0]).toMatchObject({ kind: 'Reference', title: 'Momentum' });
  });
  it('indexes game titles, summaries, key rules, and node labels', () => {
    expect(searchContent(index, 'Ironsworn')[0]?.kind).toBe('Game');
    expect(searchContent(index, 'magnitude').some(result => result.title === 'Momentum')).toBe(true);
    expect(searchContent(index, 'precision').some(result => result.title === 'Secure an Advantage')).toBe(true);
    expect(searchContent(index, 'canceled').some(result => result.title === 'Action Roll')).toBe(true);
  });
  it('ranks aliases and normalizes punctuation and case', () => {
    const game = contentRegistry.games[0]!;
    const registry = { ...contentRegistry, games: [{ ...game, procedures: new Map([
      ...game.procedures, ['gather-information', { ...game.procedures.get('gather-information')!, aliases: ['Investigation'] }],
    ]) }] };
    expect(searchContent(createSearchIndex(registry), 'INVESTIGATION!')[0]?.title).toBe('Gather Information');
  });
  it('returns no results for empty or unmatched input and respects scope', () => {
    expect(searchContent(index, '  ')).toEqual([]);
    expect(searchContent(index, 'not in this library')).toEqual([]);
    expect(searchContent(index, 'gather', 'ironsworn')).not.toHaveLength(0);
    expect(searchContent(index, 'gather', 'another-game')).toEqual([]);
  });
});
