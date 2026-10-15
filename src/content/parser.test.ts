import { describe, expect, it } from 'vitest';

import { stringify } from 'yaml';
import { ContentParseError, parseCrosslinks, parseGameDocument, parseProcedure, parseReference } from './parser';

const validProcedure = `
id: example
title: Example
summary: A valid example.
source:
  section: Example heading
nodes:
  - id: start
    type: start
    label: Begin
  - id: end
    type: end
    label: End
edges:
  - from: start
    to: end
`;

const validGame = {
  schemaVersion: 1,
  game: {
    id: 'example', title: 'Example',
    source: {
      publication: { title: 'Example rules', edition: '1', url: 'https://example.com/rules', creator: 'Example author' },
      licensing: {
        copyright: 'Copyright Example author',
        license: { name: 'Example license', url: 'https://example.com/license' },
        attribution: 'Based on Example rules by Example author.',
        adaptation: 'Text reorganized into procedures.',
      },
    },
  },
  sections: [],
};

describe('content parser', () => {
  it('parses the derived procedure crosslink manifest', () => {
    expect(parseCrosslinks('overview:\n  - details\ndetails: []\n', 'crosslinks.yaml')).toEqual({
      details: [],
      overview: ['details'],
    });
  });

  it('parses and normalizes optional procedure collections', () => {
    const procedure = parseProcedure(validProcedure, 'example.yaml');

    expect(procedure.aliases).toEqual([]);
    expect(procedure.keyRules).toEqual([]);
    expect(procedure.references).toEqual([]);
    expect(procedure.related).toEqual([]);
  });

  it('reports malformed source metadata with its file name', () => {
    const malformed = validProcedure.replace('section: Example heading', 'section: ""');

    expect(() => parseProcedure(malformed, 'broken.yaml')).toThrow(ContentParseError);
    expect(() => parseProcedure(malformed, 'broken.yaml')).toThrow(/broken\.yaml: source\.section/);
  });

  it('requires game-level source and licensing metadata', () => {
    expect(parseGameDocument(stringify(validGame), 'game.yaml').game.source).toEqual(validGame.game.source);
    for (const group of ['publication', 'licensing'] as const) {
      for (const field of Object.keys(validGame.game.source[group])) {
        const malformed = structuredClone(validGame);
        Reflect.deleteProperty(malformed.game.source[group], field);
        expect(() => parseGameDocument(stringify(malformed), 'game.yaml')).toThrow(
          new RegExp(`game\\.yaml: game\\.source\\.${group}\\.${field}`),
        );
      }
    }
    expect(() => parseGameDocument('schemaVersion: 1\ngame: { id: example, title: Example }\nsections: []', 'game.yaml')).toThrow(/game\.source/);
  });

  it.each(['', 'not-a-url', 'javascript:alert(1)', 'file:///rules', 'ftp://example.com/rules'])(
    'rejects malformed or non-web source and license URLs: %s', url => {
      const malformed = structuredClone(validGame);
      malformed.game.source.publication.url = url;
      expect(() => parseGameDocument(stringify(malformed), 'game.yaml')).toThrow(/publication\.url/);
      malformed.game.source.publication.url = validGame.game.source.publication.url;
      malformed.game.source.licensing.license.url = url;
      expect(() => parseGameDocument(stringify(malformed), 'game.yaml')).toThrow(/licensing\.license\.url/);
    },
  );

  it('rejects blank licensing notices and incomplete override groups', () => {
    for (const field of ['copyright', 'attribution', 'adaptation'] as const) {
      const malformed = structuredClone(validGame);
      malformed.game.source.licensing[field] = ' ';
      expect(() => parseGameDocument(stringify(malformed), 'game.yaml')).toThrow(new RegExp(`licensing\\.${field}`));
    }
    expect(() => parseProcedure(validProcedure.replace('section: Example heading', 'section: Example heading\n  overrides:\n    publication: { title: Other rules }'), 'override.yaml')).toThrow(/source\.overrides\.publication/);
    expect(() => parseReference(stringify({ id: 'term', title: 'Term', summary: 'Example', source: { section: 'Terms', overrides: { licensing: { license: { name: 'Other license', url: 'https://example.com/license' } } } } }), 'override.yaml')).toThrow(/source\.overrides\.licensing/);
  });

  it('accepts verified pages and rejects invalid pagination for both resource types', () => {
    const reference = { id: 'term', title: 'Term', summary: 'Example', source: { section: 'Terms', pages: [2, 3] } };
    expect(parseReference(stringify(reference), 'term.yaml').source.pages).toEqual([2, 3]);
    expect(parseProcedure(validProcedure.replace('section: Example heading', 'section: Example heading\n  pages: [2, 3]'), 'example.yaml').source.pages).toEqual([2, 3]);
    for (const pages of [[], [0], [-1], [1.5], ['2']]) {
      expect(() => parseReference(stringify({ ...reference, source: { section: 'Terms', pages } }), 'term.yaml')).toThrow(/source\.pages/);
      expect(() => parseProcedure(validProcedure.replace('section: Example heading', `section: Example heading\n  pages: ${JSON.stringify(pages)}`), 'example.yaml')).toThrow(/source\.pages/);
    }
  });
});
