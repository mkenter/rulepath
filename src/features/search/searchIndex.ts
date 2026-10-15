import type { ContentRegistry } from '../../content/registry';

export type SearchResultKind = 'Game' | 'Procedure' | 'Reference';

export interface SearchResult {
  gameId: string;
  gameTitle: string;
  kind: SearchResultKind;
  path: string;
  summary?: string;
  title: string;
}

interface SearchDocument extends SearchResult {
  aliases: readonly string[];
  supportingText: string;
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function createSearchIndex(registry: ContentRegistry): readonly SearchDocument[] {
  return registry.games.flatMap((game) => {
    const gamePath = `/games/${game.details.id}`;
    const gameDocument: SearchDocument = {
      aliases: [],
      gameId: game.details.id,
      gameTitle: game.details.title,
      kind: 'Game',
      path: gamePath,
      summary: game.details.summary,
      supportingText: game.details.summary ?? '',
      title: game.details.title,
    };
    const procedures = [...game.procedures.values()].map<SearchDocument>((procedure) => ({
      aliases: procedure.aliases,
      gameId: game.details.id,
      gameTitle: game.details.title,
      kind: 'Procedure',
      path: `${gamePath}/procedures/${procedure.id}`,
      summary: procedure.summary,
      supportingText: [
        procedure.summary,
        ...procedure.keyRules,
        ...procedure.nodes.map((node) => node.label),
      ].join(' '),
      title: procedure.title,
    }));
    const references = [...game.references.values()].map<SearchDocument>((reference) => ({
      aliases: reference.aliases,
      gameId: game.details.id,
      gameTitle: game.details.title,
      kind: 'Reference',
      path: `${gamePath}/reference/${reference.id}`,
      summary: reference.summary,
      supportingText: reference.summary,
      title: reference.title,
    }));

    return [gameDocument, ...procedures, ...references];
  });
}

function rankDocument(document: SearchDocument, normalizedQuery: string) {
  const title = normalize(document.title);
  const aliases = document.aliases.map(normalize);
  if (title === normalizedQuery) return 0;
  if (title.startsWith(normalizedQuery)) return 1;
  if (aliases.some((alias) => alias === normalizedQuery || alias.startsWith(normalizedQuery))) return 2;
  if (title.includes(normalizedQuery)) return 3;
  if (aliases.some((alias) => alias.includes(normalizedQuery))) return 4;
  if (normalize(document.supportingText).includes(normalizedQuery)) return 5;
  if (normalize(document.gameTitle).includes(normalizedQuery)) return 6;
  return undefined;
}

export function searchContent(
  index: readonly SearchDocument[],
  query: string,
  gameId?: string,
): readonly SearchResult[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  return index
    .filter((document) => !gameId || document.gameId === gameId)
    .flatMap((document) => {
      const rank = rankDocument(document, normalizedQuery);
      return rank === undefined ? [] : [{ document, rank }];
    })
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.document.title.localeCompare(right.document.title) ||
        left.document.path.localeCompare(right.document.path),
    )
    .map(({ document: { aliases: _aliases, supportingText: _supportingText, ...result } }) => result);
}
