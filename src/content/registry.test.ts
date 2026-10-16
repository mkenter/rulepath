import { describe, expect, it } from 'vitest';

import { createContentRegistry, ContentValidationError, resolveSource, type ContentBundle } from './registry';
import type { GameDocument, Procedure, Reference } from './schema';

const game: GameDocument = {
  schemaVersion: 1,
  game: {
    id: 'fixture', title: 'Fixture',
    source: {
      publication: { title: 'Fixture rules', edition: '1', url: 'https://example.com/rules', creator: 'Fixture author' },
      licensing: {
        copyright: 'Copyright Fixture author',
        license: { name: 'Fixture license', url: 'https://example.com/license' },
        attribution: 'Based on Fixture rules by Fixture author.',
        adaptation: 'Synthetic test content.',
      },
    },
  },
  sections: [
    {
      id: 'contents',
      title: 'Contents',
      items: [{ procedure: 'overview' }, { reference: 'term' }],
    },
  ],
};

const procedure: Procedure = {
  id: 'overview',
  title: 'Overview',
  aliases: [],
  summary: 'Fixture overview.',
  source: { section: 'Synthetic fixture' },
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'linked', type: 'procedure', label: 'Overview', target: 'overview' },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { from: 'start', to: 'linked' },
    { from: 'linked', to: 'end' },
  ],
  keyRules: [],
  references: ['term'],
  related: [],
  authorNotes: [],
};

const reference: Reference = {
  id: 'term',
  title: 'Term',
  aliases: [],
  summary: 'Fixture term.',
  source: { section: 'Synthetic fixture' },
  related: [{ procedure: 'overview' }],
  authorNotes: [],
};

function bundle(overrides: Partial<ContentBundle> = {}): ContentBundle {
  return { game, procedures: [procedure], references: [reference], ...overrides };
}

describe('content registry', () => {
  it('inherits shared provenance and keeps resource headings and verified pages', () => {
    expect(resolveSource(game.game.source, { section: 'Overview', pages: [2, 3] })).toEqual({
      ...game.game.source, section: 'Overview', pages: [2, 3],
    });
  });

  it('replaces complete source and licensing groups independently without changing defaults', () => {
    const original = structuredClone(game.game.source);
    const publication = { title: 'Supplement', edition: '2', url: 'https://example.com/supplement', creator: 'Another author' };
    const licensing = {
      copyright: 'Copyright Another author',
      license: { name: 'Different license', url: 'https://example.com/different-license' },
      attribution: 'Based on Supplement by Another author.',
      adaptation: 'Adapted supplement.',
    };
    expect(resolveSource(original, { section: 'Appendix', overrides: { publication } })).toEqual({
      publication, licensing: original.licensing, section: 'Appendix',
    });
    expect(resolveSource(original, { section: 'Appendix', overrides: { licensing } })).toEqual({
      publication: original.publication, licensing, section: 'Appendix',
    });
    expect(resolveSource(original, { section: 'Appendix', overrides: { publication, licensing } })).toEqual({
      publication, licensing, section: 'Appendix',
    });
    expect(original).toEqual(game.game.source);
  });

  it('normalizes valid bundles and resolves canonical resources', () => {
    const registry = createContentRegistry([bundle()]);

    expect(registry.getGame('fixture')?.details.title).toBe('Fixture');
    expect(registry.getProcedure('fixture', 'overview')).toBe(procedure);
    expect(registry.getReference('fixture', 'term')).toBe(reference);
  });

  it('rejects duplicate resource IDs', () => {
    expect(() =>
      createContentRegistry([bundle({ procedures: [procedure, procedure] })]),
    ).toThrow(/duplicate procedure ID/);
  });

  it('rejects an ID shared by a procedure and reference in the same game', () => {
    expect(() => createContentRegistry([bundle({ references: [{ ...reference, id: 'overview' }] })])).toThrow(/duplicate resource ID "overview" across procedures and references/);
  });

  it('rejects broken edges and unreachable nodes', () => {
    const broken: Procedure = {
      ...procedure,
      nodes: [...procedure.nodes, { id: 'orphan', type: 'step', label: 'Orphan' }],
      edges: [...procedure.edges, { from: 'missing', to: 'end' }],
    };

    expect(() => createContentRegistry([bundle({ procedures: [broken] })])).toThrow(
      ContentValidationError,
    );
    expect(() => createContentRegistry([bundle({ procedures: [broken] })])).toThrow(
      /edge source "missing" does not exist[\s\S]*node "orphan" is unreachable/,
    );
  });

  it('rejects missing procedure and reference targets', () => {
    const missingTargets: Procedure = {
      ...procedure,
      nodes: [
        { id: 'start', type: 'start', label: 'Start' },
        { id: 'linked', type: 'procedure', label: 'Missing', target: 'missing-flow' },
        { id: 'end', type: 'end', label: 'End' },
      ],
      references: ['missing-term'],
    };

    expect(() => createContentRegistry([bundle({ procedures: [missingTargets] })])).toThrow(
      /targets missing procedure "missing-flow"[\s\S]*references missing reference "missing-term"/,
    );
  });
});
