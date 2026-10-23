import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] === 'full' ? 'full' : 'quick';
const outputDir = `artifacts/screenshots/${mode}`;
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', 'e2e/design-review.spec.ts', '--workers=1'], {
  stdio: 'inherit',
  env: { ...process.env, SCREENSHOT_MODE: mode, SCREENSHOT_DIR: outputDir },
});
process.exit(result.status ?? 1);
