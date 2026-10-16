import type { ContentRegistry } from '../src/content/registry';

// Select by capabilities, never by game order, title, or a known resource ID.
export function contentScenarios(registry: ContentRegistry) {
  const procedures = registry.games.flatMap(game => [...game.procedures.values()].map(procedure => ({
    game, procedure, path: `/games/${game.details.id}/procedures/${procedure.id}`,
  })));
  const references = registry.games.flatMap(game => [...game.references.values()].map(reference => ({
    game, reference, path: `/games/${game.details.id}/reference/${reference.id}`,
  })));
  const procedureLinks = procedures.flatMap(entry => entry.procedure.nodes.flatMap(node => {
    if (node.type !== 'procedure' || node.target === entry.procedure.id) return [];
    const target = entry.game.procedures.get(node.target)!;
    return [{ ...entry, node, target, targetPath: `/games/${entry.game.details.id}/procedures/${target.id}` }];
  }));
  const referenceLinks = procedures.flatMap(entry => entry.procedure.references.map(id => ({
    ...entry, reference: entry.game.references.get(id)!, referencePath: `/games/${entry.game.details.id}/reference/${id}`,
  })));
  const decisions = procedures.flatMap(entry => entry.procedure.nodes.flatMap(node =>
    node.type === 'decision' ? [{ ...entry, node }] : [],
  ));
  return { procedures, references, procedureLinks, referenceLinks, decisions };
}

export function unusedId(ids: Iterable<string>) {
  const used = new Set(ids);
  let id = 'missing';
  while (used.has(id)) id += '-missing';
  return id;
}
