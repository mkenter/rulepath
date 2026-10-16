import { parseCrosslinks, parseGameDocument, parseProcedure, parseReference } from './parser';
import { createContentRegistry, ContentValidationError, type ContentBundle, type ContentRegistry } from './registry';
import type { Crosslinks } from './schema';

export interface ContentSources {
  games: Record<string, string>;
  procedures: Record<string, string>;
  references: Record<string, string>;
  crosslinks: Record<string, string>;
}

function parseSources<T>(
  sources: Record<string, string>,
  directory: string,
  child: string,
  parser: (source: string, name: string) => T,
): T[] {
  return Object.entries(sources)
    .filter(([name]) => name.startsWith(`${directory}/${child}/`))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, source]) => parser(source, name));
}

export function loadContentRegistry(sources: ContentSources): ContentRegistry {
  const allNames = Object.values(sources).flatMap((group) => Object.keys(group));
  const directories = [...new Set(allNames.map((name) => {
    const resource = name.includes('/procedures/') || name.includes('/reference/');
    return name.split('/').slice(0, resource ? -2 : -1).join('/');
  }))].sort();
  const bundles: ContentBundle[] = [];
  const crosslinksById = new Map<string, Crosslinks>();
  const directoryIssues: string[] = [];

  for (const directory of directories) {
    const gameName = `${directory}/game.yaml`;
    const crosslinksName = `${directory}/crosslinks.yaml`;
    if (!(gameName in sources.games)) {
      throw new ContentValidationError([`${directory}: missing game.yaml`]);
    }
    if (!(crosslinksName in sources.crosslinks)) {
      throw new ContentValidationError([`${directory}: missing crosslinks.yaml`]);
    }
    const game = parseGameDocument(sources.games[gameName]!, gameName);
    const directoryId = directory.slice(directory.lastIndexOf('/') + 1);
    if (game.game.id !== directoryId) {
      directoryIssues.push(`${gameName}: game ID "${game.game.id}" does not match directory "${directoryId}"`);
    }
    bundles.push({
      game,
      procedures: parseSources(sources.procedures, directory, 'procedures', parseProcedure),
      references: parseSources(sources.references, directory, 'reference', parseReference),
    });
    crosslinksById.set(game.game.id, parseCrosslinks(sources.crosslinks[crosslinksName]!, crosslinksName));
  }

  const registry = createContentRegistry(bundles);
  if (directoryIssues.length) throw new ContentValidationError(directoryIssues);
  const issues: string[] = [];
  for (const game of registry.games) {
    const crosslinks = crosslinksById.get(game.details.id)!;
    for (const procedure of game.procedures.values()) {
      const declared = crosslinks[procedure.id];
      const actual = [...new Set(procedure.nodes.flatMap((node) =>
        node.type === 'procedure' ? [node.target] : [],
      ))].sort();
      if (!declared) {
        issues.push(`${game.details.id}: missing crosslink entry for procedure "${procedure.id}"`);
      } else if (JSON.stringify([...declared].sort()) !== JSON.stringify(actual)) {
        issues.push(`${game.details.id}: procedure "${procedure.id}" declares [${[...declared].sort().join(', ')}] but links [${actual.join(', ')}]`);
      }
    }
    for (const procedureId of Object.keys(crosslinks)) {
      if (!game.procedures.has(procedureId)) {
        issues.push(`${game.details.id}: crosslinks contains unknown procedure "${procedureId}"`);
      }
    }
  }
  if (issues.length) throw new ContentValidationError(issues);
  return registry;
}
