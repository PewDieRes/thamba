import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, onTestFinished, test } from 'vitest';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const cruise = join(
  repository,
  'node_modules',
  'dependency-cruiser',
  'bin',
  'dependency-cruise.mjs',
);
const config = join(repository, 'dependency-cruiser.config.cjs');
const serverEntry = 'src/infrastructure/composition/container.ts';
const serverPage = 'src/app/page.ts';
const serverWiring = 'export { compose } from "@infrastructure/composition/container";';
const browserPage = 'src/app/browser.ts';
const fixtureCases = [
  {
    rule: 'domain-stays-pure',
    modules: {
      'src/domain/booking.ts':
        'import type { Port } from "@application/ports/port"; export type Booking = Port;',
      'src/application/ports/port.ts': 'export type Port = string;',
    },
  },
  {
    rule: 'interface-uses-contracts',
    modules: {
      'src/interface/ui/view.ts': 'export { adapter } from "./barrel";',
      'src/interface/ui/barrel.ts': 'export { adapter } from "@infrastructure/memory/adapter";',
      'src/infrastructure/memory/adapter.ts': 'export const adapter = {};',
    },
  },
  {
    rule: 'browser-cannot-reach-server-infrastructure',
    modules: {
      [browserPage]: '"use client"; export { compose } from "./page";',
      [serverPage]: serverWiring,
      [serverEntry]: 'export const compose = () => ({});',
    },
  },
  {
    rule: null,
    modules: {
      [browserPage]: '"use client"; export { view } from "@ui/view";',
      [serverPage]: serverWiring,
      [serverEntry]: 'export const compose = () => ({});',
      'src/interface/ui/view.ts': 'export const view = "थांबा";',
    },
  },
];

test.each(fixtureCases)('reports the expected boundary result ($rule)', ({ rule, modules }) => {
  const directory = mkdtempSync(join(tmpdir(), 'thamba-boundaries-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  copyFileSync(join(repository, 'tsconfig.json'), join(directory, 'tsconfig.json'));
  for (const [path, source] of Object.entries(modules)) {
    const destination = join(directory, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, source);
  }

  const result = spawnSync(process.execPath, [cruise, '--config', config, 'src'], {
    cwd: directory,
    encoding: 'utf8',
  });
  const output = result.stdout + result.stderr;
  expect(result.status, output).toBe(rule ? 1 : 0);
  if (rule) expect(output).toContain(`error ${rule}:`);
});
