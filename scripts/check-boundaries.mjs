import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const config = fileURLToPath(new URL('../dependency-cruiser.config.cjs', import.meta.url));
const cruiser = fileURLToPath(
  new URL('../node_modules/dependency-cruiser/bin/dependency-cruise.mjs', import.meta.url),
);

// Colocated tests are not entry points. Imports from production still traverse them.
const entries = globSync('src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}', {
  exclude: ['**/*.use-case.test.ts'],
});
const result = spawnSync(process.execPath, [cruiser, '--config', config, ...entries], {
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
