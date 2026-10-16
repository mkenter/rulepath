import type { GameDocument, Procedure, Reference, ResolvedSource, SectionItem, Source, SourceMetadata } from './schema';

export function resolveSource(gameSource: SourceMetadata, resourceSource: Source): ResolvedSource {
  return {
    publication: resourceSource.overrides?.publication ?? gameSource.publication,
    licensing: resourceSource.overrides?.licensing ?? gameSource.licensing,
    section: resourceSource.section,
    pages: resourceSource.pages,
  };
}

export interface ContentBundle {
  game: GameDocument;
  procedures: readonly Procedure[];
  references: readonly Reference[];
}

export interface GameContent {
  readonly details: GameDocument['game'];
  readonly sections: GameDocument['sections'];
  readonly procedures: ReadonlyMap<string, Procedure>;
  readonly references: ReadonlyMap<string, Reference>;
}

export interface ContentRegistry {
  readonly games: readonly GameContent[];
  getGame(gameId: string): GameContent | undefined;
  getProcedure(gameId: string, procedureId: string): Procedure | undefined;
  getReference(gameId: string, referenceId: string): Reference | undefined;
}

export class ContentValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Content validation failed:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'ContentValidationError';
  }
}

function itemTarget(item: SectionItem): { kind: 'procedure' | 'reference'; id: string } {
  return 'procedure' in item
    ? { kind: 'procedure', id: item.procedure }
    : { kind: 'reference', id: item.reference };
}

function validateProcedure(
  gameId: string,
  procedure: Procedure,
  procedures: ReadonlyMap<string, Procedure>,
  references: ReadonlyMap<string, Reference>,
  issues: string[],
) {
  const prefix = `${gameId}/procedures/${procedure.id}`;
  const nodes = new Map<string, Procedure['nodes'][number]>();
  const normalizedAliases = new Set<string>();

  for (const alias of procedure.aliases) {
    const normalized = alias.toLocaleLowerCase();
    if (normalized === procedure.title.toLocaleLowerCase()) {
      issues.push(`${prefix}: alias "${alias}" duplicates the title`);
    } else if (normalizedAliases.has(normalized)) {
      issues.push(`${prefix}: duplicate alias "${alias}"`);
    }
    normalizedAliases.add(normalized);
  }

  for (const node of procedure.nodes) {
    if (nodes.has(node.id)) {
      issues.push(`${prefix}: duplicate node ID "${node.id}"`);
    } else {
      nodes.set(node.id, node);
    }

    if (node.type === 'procedure' && !procedures.has(node.target)) {
      issues.push(`${prefix}: node "${node.id}" targets missing procedure "${node.target}"`);
    }
  }

  const startNodes = procedure.nodes.filter((node) => node.type === 'start');
  if (startNodes.length !== 1) {
    issues.push(`${prefix}: expected exactly one start node, found ${startNodes.length}`);
  }

  if (!procedure.nodes.some((node) => node.type === 'end')) {
    issues.push(`${prefix}: expected at least one end node`);
  }

  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();
  const edgeKeys = new Set<string>();
  for (const edge of procedure.edges) {
    if (!nodes.has(edge.from)) {
      issues.push(`${prefix}: edge source "${edge.from}" does not exist`);
    }
    if (!nodes.has(edge.to)) {
      issues.push(`${prefix}: edge target "${edge.to}" does not exist`);
    }
    const targets = adjacency.get(edge.from) ?? [];
    targets.push(edge.to);
    adjacency.set(edge.from, targets);
    const sources = reverseAdjacency.get(edge.to) ?? [];
    sources.push(edge.from);
    reverseAdjacency.set(edge.to, sources);

    const edgeKey = `${edge.from}\u0000${edge.to}\u0000${edge.label ?? ''}`;
    if (edgeKeys.has(edgeKey)) {
      issues.push(`${prefix}: duplicate edge "${edge.from}" to "${edge.to}"`);
    }
    edgeKeys.add(edgeKey);
  }

  for (const node of procedure.nodes) {
    if (node.type === 'end' && adjacency.has(node.id)) {
      issues.push(`${prefix}: end node "${node.id}" has an outgoing edge`);
    }
    if (node.type === 'decision') {
      const outgoing = procedure.edges.filter((edge) => edge.from === node.id);
      if (outgoing.length < 1) {
        issues.push(`${prefix}: decision node "${node.id}" has no outcomes`);
      }
      if (outgoing.some((edge) => !edge.label)) {
        issues.push(`${prefix}: decision node "${node.id}" has an unlabelled outcome`);
      }
    }
  }

  const startId = startNodes[0]?.id;
  if (startId) {
    const reachable = new Set<string>();
    const pending = [startId];
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current || reachable.has(current) || !nodes.has(current)) {
        continue;
      }
      reachable.add(current);
      pending.push(...(adjacency.get(current) ?? []));
    }

    for (const node of procedure.nodes) {
      if (!reachable.has(node.id)) {
        issues.push(`${prefix}: node "${node.id}" is unreachable from "${startId}"`);
      }
    }
  }

  const endIds = procedure.nodes.filter((node) => node.type === 'end').map((node) => node.id);
  const reachesEnd = new Set<string>();
  const reversePending = [...endIds];
  while (reversePending.length > 0) {
    const current = reversePending.pop();
    if (!current || reachesEnd.has(current) || !nodes.has(current)) {
      continue;
    }
    reachesEnd.add(current);
    reversePending.push(...(reverseAdjacency.get(current) ?? []));
  }
  for (const node of procedure.nodes) {
    if (!reachesEnd.has(node.id)) {
      issues.push(`${prefix}: node "${node.id}" cannot reach an end node`);
    }
  }

  for (const referenceId of procedure.references) {
    if (!references.has(referenceId)) {
      issues.push(`${prefix}: references missing reference "${referenceId}"`);
    }
  }

  for (const relatedId of procedure.related) {
    if (!procedures.has(relatedId)) {
      issues.push(`${prefix}: related procedure "${relatedId}" does not exist`);
    }
  }
}

function validateReference(
  gameId: string,
  reference: Reference,
  procedures: ReadonlyMap<string, Procedure>,
  references: ReadonlyMap<string, Reference>,
  issues: string[],
) {
  const prefix = `${gameId}/reference/${reference.id}`;
  const normalizedAliases = new Set<string>();

  for (const alias of reference.aliases) {
    const normalized = alias.toLocaleLowerCase();
    if (normalized === reference.title.toLocaleLowerCase()) {
      issues.push(`${prefix}: alias "${alias}" duplicates the title`);
    } else if (normalizedAliases.has(normalized)) {
      issues.push(`${prefix}: duplicate alias "${alias}"`);
    }
    normalizedAliases.add(normalized);
  }

  for (const related of reference.related) {
    if ('procedure' in related && !procedures.has(related.procedure)) {
      issues.push(`${prefix}: related procedure "${related.procedure}" does not exist`);
    }
    if ('reference' in related && !references.has(related.reference)) {
      issues.push(`${prefix}: related reference "${related.reference}" does not exist`);
    }
  }
}

export function createContentRegistry(bundles: readonly ContentBundle[]): ContentRegistry {
  const issues: string[] = [];
  const gamesById = new Map<string, GameContent>();

  for (const bundle of bundles) {
    const gameId = bundle.game.game.id;
    if (gamesById.has(gameId)) {
      issues.push(`duplicate game ID "${gameId}"`);
      continue;
    }

    const procedures = new Map<string, Procedure>();
    for (const procedure of bundle.procedures) {
      if (procedures.has(procedure.id)) {
        issues.push(`${gameId}: duplicate procedure ID "${procedure.id}"`);
      } else {
        procedures.set(procedure.id, procedure);
      }
    }

    const references = new Map<string, Reference>();
    for (const reference of bundle.references) {
      if (references.has(reference.id)) {
        issues.push(`${gameId}: duplicate reference ID "${reference.id}"`);
      } else {
        references.set(reference.id, reference);
      }
    }

    const sectionIds = new Set<string>();
    const listedCanonicalPaths = new Set<string>();
    for (const section of bundle.game.sections) {
      if (sectionIds.has(section.id)) {
        issues.push(`${gameId}: duplicate section ID "${section.id}"`);
      }
      sectionIds.add(section.id);

      for (const item of section.items) {
        const target = itemTarget(item);
        const collection = target.kind === 'procedure' ? procedures : references;
        const canonicalPath = `${target.kind}/${target.id}`;
        if (listedCanonicalPaths.has(canonicalPath)) {
          issues.push(`${gameId}/sections/${section.id}: duplicate item "${canonicalPath}"`);
        }
        listedCanonicalPaths.add(canonicalPath);
        if (!collection.has(target.id)) {
          issues.push(
            `${gameId}/sections/${section.id}: missing ${target.kind} "${target.id}"`,
          );
        }
      }
    }

    for (const procedureId of procedures.keys()) {
      if (!listedCanonicalPaths.has(`procedure/${procedureId}`)) {
        issues.push(`${gameId}: procedure "${procedureId}" is missing from game sections`);
      }
    }
    for (const referenceId of references.keys()) {
      if (!listedCanonicalPaths.has(`reference/${referenceId}`)) {
        issues.push(`${gameId}: reference "${referenceId}" is missing from game sections`);
      }
    }

    for (const procedure of procedures.values()) {
      validateProcedure(gameId, procedure, procedures, references, issues);
    }
    for (const reference of references.values()) {
      validateReference(gameId, reference, procedures, references, issues);
    }

    gamesById.set(gameId, {
      details: bundle.game.game,
      sections: bundle.game.sections,
      procedures,
      references,
    });
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues);
  }

  const games = [...gamesById.values()];
  return {
    games,
    getGame: (gameId) => gamesById.get(gameId),
    getProcedure: (gameId, procedureId) => gamesById.get(gameId)?.procedures.get(procedureId),
    getReference: (gameId, referenceId) => gamesById.get(gameId)?.references.get(referenceId),
  };
}
