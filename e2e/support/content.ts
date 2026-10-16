import { readdirSync, readFileSync } from 'node:fs';

import { loadContentRegistry, type ContentSources } from '../../src/content/load-content';
import { contentScenarios } from '../../tests/content-scenarios';

// Playwright runs in Node, so read the production directories and use the real loader.
// No fixture is added to Vite or to the production content bundle.
const sources: ContentSources = { games: {}, procedures: {}, references: {}, crosslinks: {} };
for (const entry of readdirSync('content', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = `content/${entry.name}`;
  for (const [key, filename] of [['games', 'game.yaml'], ['crosslinks', 'crosslinks.yaml']] as const) {
    const name = `${directory}/${filename}`;
    sources[key][name] = readFileSync(name, 'utf8');
  }
  for (const [key, child] of [['procedures', 'procedures'], ['references', 'reference']] as const) {
    for (const filename of readdirSync(`${directory}/${child}`)) {
      if (!filename.endsWith('.yaml')) continue;
      const name = `${directory}/${child}/${filename}`;
      sources[key][name] = readFileSync(name, 'utf8');
    }
  }
}
export const registry = loadContentRegistry(sources);
export const scenarios = contentScenarios(registry);
