import { parseGameDocument, parseProcedure, parseReference } from './parser';
import { createContentRegistry, type ContentBundle } from './registry';

const gameSources = import.meta.glob<string>('../../content/*/game.yaml', {
  eager: true,
  import: 'default',
  query: '?raw',
});
const procedureSources = import.meta.glob<string>('../../content/*/procedures/*.yaml', {
  eager: true,
  import: 'default',
  query: '?raw',
});
const referenceSources = import.meta.glob<string>('../../content/*/reference/*.yaml', {
  eager: true,
  import: 'default',
  query: '?raw',
});

function parseSources<T>(
  sources: Record<string, string>,
  parser: (source: string, sourceName: string) => T,
): T[] {
  return Object.entries(sources)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sourceName, source]) => parser(source, sourceName));
}

function sourcesUnder(
  sources: Record<string, string>,
  directory: string,
  childDirectory: 'procedures' | 'reference',
): Record<string, string> {
  const prefix = `${directory}/${childDirectory}/`;
  return Object.fromEntries(
    Object.entries(sources).filter(([sourceName]) => sourceName.startsWith(prefix)),
  );
}

const bundles: ContentBundle[] = Object.entries(gameSources)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([gameSourceName, gameSource]) => {
    const directory = gameSourceName.slice(0, gameSourceName.lastIndexOf('/'));
    return {
      game: parseGameDocument(gameSource, gameSourceName),
      procedures: parseSources(
        sourcesUnder(procedureSources, directory, 'procedures'),
        parseProcedure,
      ),
      references: parseSources(
        sourcesUnder(referenceSources, directory, 'reference'),
        parseReference,
      ),
    };
  });

export const contentRegistry = createContentRegistry(bundles);
