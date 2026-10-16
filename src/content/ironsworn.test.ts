import { describe, expect, it } from 'vitest';
import { contentRegistry } from './bundled-content';
import { resolveSource } from './registry';
import { createSearchIndex, searchContent } from '../features/search/searchIndex';

describe('Ironsworn sample regressions', () => {
  it('preserves the Ironsworn SRD sample and lists its resources exactly once', () => {
    expect(contentRegistry.getGame('ironsworn')).toBeDefined();
    const game = contentRegistry.getGame('ironsworn')!;
    expect(game.procedures.size).toBe(5);
    expect(game.references.size).toBe(6);
    const paths = game.sections.flatMap(section => section.items.map(item =>
      'procedure' in item ? `procedure/${item.procedure}` : `reference/${item.reference}`,
    ));
    expect(paths).toHaveLength(11);
    expect(new Set(paths).size).toBe(11);
    const metadata = game.details.source;
    expect(metadata.publication.edition).toContain('SRD .09');
    expect(metadata.publication.creator).toBe('Shawn Tomkin');
    expect(metadata.publication.url).toContain('11ypqt6GfLuBhGDJuBGWKlHa-Ru48Tf3G_6zbrYKmXgY');
    expect(metadata.licensing.license.url).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(metadata.licensing.attribution).toContain('created by Shawn Tomkin');
    expect(metadata.licensing.copyright).toBe('Copyright ©2018 Shawn Tomkin.');
    expect(metadata.licensing.adaptation).toContain('reorganized and paraphrased');
    for (const resource of [...game.procedures.values(), ...game.references.values()]) {
      expect(Object.keys(resource.source)).toEqual(['section']);
      expect(resource.source.section.length).toBeGreaterThan(0);
      expect(resolveSource(metadata, resource.source).licensing).toBe(metadata.licensing);
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
    expect(game.references.get('price-table')?.summary).toContain('99-00');
    expect(game.references.get('oracle-options')?.summary).toContain('four options');
  });
  it('finds the known Gather Information procedure', () => {
    expect(searchContent(createSearchIndex(contentRegistry), 'Gather Information', 'ironsworn')[0]?.path).toBe('/games/ironsworn/procedures/gather-information');
  });
});
