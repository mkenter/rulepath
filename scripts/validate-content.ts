import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { loadContentRegistry, type ContentSources } from '../src/content/load-content';

async function readSources(directories: string[]): Promise<ContentSources> {
  const sources: ContentSources = { games: {}, procedures: {}, references: {}, crosslinks: {} };
  for (const directory of directories) {
    const root = `content/${directory}`;
    for (const [key, child] of [['games', 'game.yaml'], ['crosslinks', 'crosslinks.yaml']] as const) {
      const name = `${root}/${child}`;
      sources[key][name] = await readFile(name, 'utf8');
    }
    for (const [key, child] of [['procedures', 'procedures'], ['references', 'reference']] as const) {
      const folder = `${root}/${child}`;
      const entries = await readdir(folder, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.yaml')) {
          const name = `${folder}/${entry.name}`;
          sources[key][name] = await readFile(name, 'utf8');
        }
      }
    }
  }
  return sources;
}

async function main() {
  const root = path.resolve('content');
  const entries = await readdir(root, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const registry = loadContentRegistry(await readSources(directories));
  const warnings: string[] = [];
  for (const game of registry.games) {
    for (const procedure of game.procedures.values()) {
      for (const node of procedure.nodes) {
        if (node.type !== 'decision') continue;
        const outcomes = procedure.edges.filter((edge) => edge.from === node.id);
        if (outcomes.length <= 3) continue;
        warnings.push(`${game.details.id}/${procedure.title} (${procedure.id}) decision "${node.label}" (${node.id}) has ${outcomes.length} outcomes: ${outcomes.map((edge) => `${edge.label ?? 'Unlabelled'} -> ${edge.to}`).join('; ')}`);
      }
    }
  }
  if (warnings.length) console.warn(`Flow presentation warnings (>3 outcomes require authored presentation metadata):\n${warnings.map((warning) => `- ${warning}`).join('\n')}`);
  const procedures = registry.games.reduce((count, game) => count + game.procedures.size, 0);
  const references = registry.games.reduce((count, game) => count + game.references.size, 0);
  console.log(`Validated ${registry.games.length} games, ${procedures} procedures, and ${references} references.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
