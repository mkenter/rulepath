import { describe, expect, it } from 'vitest';
import { fixtureSources } from '../../../tests/fixtures/sources';
import { loadContentRegistry } from '../../content/load-content';
import { createSearchIndex, searchContent } from './searchIndex';

// Controlled synthetic content exercises search semantics without requiring a production game.
const registry = loadContentRegistry(fixtureSources);
const game = registry.games[0]!;
const procedure = [...game.procedures.values()][0]!;
const reference = [...game.references.values()][0]!;
const index = createSearchIndex(registry);

describe('search contracts with synthetic content', () => {
  it('ranks an exact title before another resource mentioning that title', () => {
    const augmented = { ...registry, games: [{ ...game, references: new Map([
      ...game.references, [reference.id, { ...reference, summary: procedure.title }],
    ]) }] };
    const results = searchContent(createSearchIndex(augmented), procedure.title);
    expect(results[0]).toMatchObject({ kind: 'Procedure', path: `/games/${game.details.id}/procedures/${procedure.id}` });
    expect(results).toContainEqual(expect.objectContaining({ kind: 'Reference', path: `/games/${game.details.id}/reference/${reference.id}` }));
  });
  it('ranks aliases and normalizes punctuation and case', () => {
    const augmented = { ...registry, games: [{ ...game, procedures: new Map([
      ...game.procedures, [procedure.id, { ...procedure, aliases: ['Investigation'] }],
    ]) }] };
    expect(searchContent(createSearchIndex(augmented), 'INVESTIGATION!')[0]?.path).toBe(`/games/${game.details.id}/procedures/${procedure.id}`);
  });
  it('finds supporting text in games, procedure rules and nodes, and structured references', () => {
    const augmented = { ...registry, games: [{
      ...game,
      details: { ...game.details, summary: 'Game synopsis' },
      procedures: new Map([[procedure.id, {
        ...procedure, summary: 'Procedure synopsis', keyRules: ['Special instruction'],
        nodes: [{ id: 'start', type: 'start' as const, label: 'Hidden trail' }],
      }]]),
      references: new Map([[reference.id, {
        ...reference, summary: 'Reference synopsis', sections: [{
          heading: 'Signal meanings', paragraphs: ['Read copper marks'], bullets: ['Repeat faint signals'],
          table: { columns: ['Mark', 'Meaning'], rows: [['Spiral', 'Safe passage']] },
        }],
      }]]),
    }] };
    const searchable = createSearchIndex(augmented);
    expect(searchContent(searchable, 'Game synopsis')).toContainEqual(expect.objectContaining({ kind: 'Game' }));
    for (const query of ['Procedure synopsis', 'Special instruction', 'Hidden trail']) {
      expect(searchContent(searchable, query)).toContainEqual(expect.objectContaining({ kind: 'Procedure', title: procedure.title }));
    }
    for (const query of ['Reference synopsis', 'Signal meanings', 'Read copper marks', 'Repeat faint signals', 'Meaning', 'Safe passage']) {
      expect(searchContent(searchable, query)).toContainEqual(expect.objectContaining({ kind: 'Reference', title: reference.title }));
    }
  });
  it('returns no results for empty or unmatched input and respects scope', () => {
    expect(searchContent(index, '  ')).toEqual([]);
    expect(searchContent(index, 'not in this library')).toEqual([]);
    expect(searchContent(index, procedure.title, game.details.id)).toContainEqual(expect.objectContaining({ title: procedure.title }));
    expect(searchContent(index, procedure.title, 'unregistered-test-game')).toEqual([]);
  });
});
