import { describe, expect, it } from 'vitest';
import { contentRegistry } from './bundled-content';
import { resolveSource } from './registry';
import { createSearchIndex, searchContent } from '../features/search/searchIndex';

describe('Ironsworn content regressions', () => {
  const index = createSearchIndex(contentRegistry);
  it('ranks exact titles before supporting-text matches', () => {
    expect(searchContent(index, 'Action Roll', 'ironsworn')[0]).toMatchObject({ kind: 'Procedure', path: '/games/ironsworn/procedures/action-roll' });
    expect(searchContent(index, 'Momentum', 'ironsworn')[0]).toMatchObject({ kind: 'Reference', title: 'Momentum' });
  });
  it('indexes game titles, summaries, key rules, and node labels', () => {
    expect(searchContent(index, 'Ironsworn')[0]?.kind).toBe('Game');
    expect(searchContent(index, 'magnitude').some(result => result.title === 'Momentum')).toBe(true);
    expect(searchContent(index, 'precision').some(result => result.title === 'Secure an Advantage')).toBe(true);
    expect(searchContent(index, 'canceled').some(result => result.title === 'Action Roll')).toBe(true);
  });

  it('preserves Ironsworn procedures and lists their supporting resources exactly once', () => {
    expect(contentRegistry.getGame('ironsworn')).toBeDefined();
    const game = contentRegistry.getGame('ironsworn')!;
    expect(game.procedures.size).toBe(39);
    expect(game.references.size).toBe(21);
    const paths = game.sections.flatMap(section => section.items.map(item =>
      'procedure' in item ? `procedure/${item.procedure}` : `reference/${item.reference}`,
    ));
    expect(paths).toHaveLength(game.procedures.size + game.references.size);
    expect(new Set(paths).size).toBe(paths.length);
    const metadata = game.details.source;
    expect(metadata.publication.edition).toContain('SRD .09');
    expect(metadata.publication.creator).toBe('Shawn Tomkin');
    expect(metadata.publication.url).toContain('11ypqt6GfLuBhGDJuBGWKlHa-Ru48Tf3G_6zbrYKmXgY');
    expect(metadata.licensing.license.url).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(metadata.licensing.attribution).toContain('created by Shawn Tomkin');
    expect(metadata.licensing.copyright).toBe('Copyright ©2018 Shawn Tomkin.');
    expect(metadata.licensing.adaptation).toContain('reorganized and paraphrased');
    for (const resource of [...game.procedures.values(), ...game.references.values()]) {
      expect(resource.source.section.length).toBeGreaterThan(0);
      expect(resolveSource(metadata, resource.source).licensing.license.url).toBe(metadata.licensing.license.url);
      expect(resolveSource(metadata, resource.source).publication.creator).toBe('Shawn Tomkin');
    }
  });
  it('preserves Ironsworn move relationships and its decisions of up to three outcomes', () => {
    const game = contentRegistry.getGame('ironsworn')!;
    expect(game.procedures.get('gather-information')?.nodes).toContainEqual(expect.objectContaining({ type: 'procedure', target: 'action-roll' }));
    expect(game.procedures.get('gather-information')?.nodes).toContainEqual(expect.objectContaining({ type: 'procedure', target: 'pay-the-price' }));
    expect(game.procedures.get('pay-the-price')?.nodes).toContainEqual(expect.objectContaining({ type: 'procedure', target: 'ask-the-oracle' }));
    for (const procedure of game.procedures.values()) {
      for (const decision of procedure.nodes.filter(node => node.type === 'decision')) {
        expect(procedure.edges.filter(edge => edge.from === decision.id).length).toBeLessThanOrEqual(3);
      }
    }
    expect(game.references.get('price-table')?.sections?.[0]?.table?.rows).toContainEqual([
      '99-00', expect.stringContaining('Roll twice more'),
    ]);
    expect(game.references.get('oracle-options')?.summary).toContain('four options');
  });
  it('finds the known Gather Information procedure', () => {
    expect(searchContent(createSearchIndex(contentRegistry), 'Gather Information', 'ironsworn')[0]?.path).toBe('/games/ironsworn/procedures/gather-information');
  });
});
