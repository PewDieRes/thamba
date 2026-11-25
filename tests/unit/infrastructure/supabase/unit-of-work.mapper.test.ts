import { expect, test } from 'vitest';
import { readCommandScope, toWriteBatch } from '@infrastructure/supabase/unit-of-work.mapper';
import { LIVE_SCOPE_ID } from '@infrastructure/supabase/row.mapper';
import { TOWN } from '../../application/demo-data.fixtures';

test('carries the expected version and live scope through the RPC payload', () => {
  const scope = readCommandScope({ town_id: TOWN, run_scope_id: LIVE_SCOPE_ID });
  expect(scope).toEqual({ town_id: TOWN, demo_run_id: null });
  const write = {
    resource: 'towns' as const,
    key: { id: TOWN },
    row: { id: TOWN },
    expectedVersion: 4,
  };
  expect(toWriteBatch([write])).toEqual([
    { resource: write.resource, row: write.row, expectedVersion: write.expectedVersion },
  ]);
});
