import { expect, test } from 'vitest';
import { domainValues } from '@infrastructure/composition/domain-values';
import { fromCommandLogRow, toCommandLogRow } from '@infrastructure/supabase/command-log.mapper';
import { NOW } from '../../application/demo-data.fixtures';

test('replays an idempotent command with bigint and domain instants intact', () => {
  const record = {
    actor: 'dispatch',
    key: 'advance',
    inputHash: 'a'.repeat(64),
    result: {
      ok: true as const,
      value: { at: NOW, queuedAt: 9_007_199_254_740_993n, $thamba: 'bigint' },
    },
  };
  const row = { ...toCommandLogRow(record, domainValues), version: 3 };
  expect(fromCommandLogRow(row, domainValues)).toEqual({ value: record, version: 3 });
  expect(
    toCommandLogRow({ ...record, result: { ok: true, value: undefined } }, domainValues).result,
  ).toEqual({ ok: true, value: { $thamba: 'undefined' } });
});
