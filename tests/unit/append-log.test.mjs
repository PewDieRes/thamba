import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import { appendLog, formatTable } from '../../scripts/append-log.mjs';

const run = {
  date: '2026-11-24',
  promptId: 'P01',
  stage: 'UNDERSTAND',
  surface: 'CLI',
  model: 'gpt-6.2-astra',
  effort: 'high',
  rationale: 'Compare primary sources',
  outcome: 'accepted',
  reason: 'Research brief retained',
  link: 'TODO',
};

test('appends one row at a time and realigns earlier rows', (context) => {
  const path = createLog(context, 'model');
  appendLog({ kind: 'model', path, entry: run });
  appendLog({
    kind: 'model',
    path,
    entry: { ...run, promptId: 'P02', reason: 'Flagged assumptions | interviews pending' },
  });

  const lines = readFileSync(path, 'utf8').trimEnd().split('\n');
  assert.equal(lines.length, 4);
  assert.match(lines[2], /P01.*accepted.*Research brief retained/);
  assert.match(lines[3], /P02.*assumptions \\\| interviews pending/);
  const dividers = (line) => Array.from(line.matchAll(/(?<!\\)\|/g), ({ index }) => index);
  for (const line of lines.slice(1)) {
    assert.deepEqual(dividers(line), dividers(lines[0]));
  }
});

test('records a mistake with a detection method and fix link', (context) => {
  const path = createLog(context, 'mistake');
  appendLog({
    kind: 'mistake',
    path,
    entry: {
      what: 'Offer accepted at expiry',
      caughtBy: 'property test',
      fixLink: 'https://example.com/thamba/pull/12',
    },
  });
  assert.match(readFileSync(path, 'utf8'), /Offer accepted at expiry.*property test.*\/pull\/12/);
});

test('rejects malformed entries without rewriting the table', (context) => {
  const path = createLog(context, 'model');
  const original = readFileSync(path, 'utf8');
  for (const invalid of [
    { date: '2026-02-30' },
    { promptId: '' },
    { stage: 'unknown' },
    { surface: 'Terminal' },
    { effort: 'maximum' },
    { outcome: 'pending' },
    { rationale: 'two\nlines' },
    { reason: '' },
    { link: 'somewhere' },
    { typo: 'extra' },
  ]) {
    assert.throws(() => appendLog({ kind: 'model', path, entry: { ...run, ...invalid } }));
  }
  assert.equal(readFileSync(path, 'utf8'), original);
});

function createLog(context, kind) {
  const directory = mkdtempSync(join(tmpdir(), 'thamba-log-'));
  context.onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'log.md');
  writeFileSync(path, formatTable({ kind, rows: [] }));
  return path;
}
