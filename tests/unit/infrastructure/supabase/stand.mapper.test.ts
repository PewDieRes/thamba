import { expect, test } from 'vitest';
import { fromStandRow, toStandRow } from '@infrastructure/supabase/stand.mapper';
import { DEMO_STAND, STAND, uuid } from '../../application/demo-data.fixtures';

test('round trips the stand row with its storage version', () => {
  const record = {
    ...DEMO_STAND,
    neighbourStandIds: [uuid(401) as typeof STAND, uuid(400) as typeof STAND],
  };
  const row = { ...toStandRow(record), version: 4 };
  const restored = fromStandRow(row);
  expect(restored).toEqual({ value: record, version: 4 });
  expect(row.neighbour_stand_ids).toEqual(record.neighbourStandIds);
});
