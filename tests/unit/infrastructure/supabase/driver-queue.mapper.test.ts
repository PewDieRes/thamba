import { expect, test } from 'vitest';
import { fromDriverQueueRow, toDriverQueueRow } from '@infrastructure/supabase/driver-queue.mapper';
import { SCOPE, DRIVER_ONE, STAND } from '../../application/demo-data.fixtures';

test('round trips the driver queue row with its storage version', () => {
  const record = {
    ...SCOPE,
    entry: {
      driverId: DRIVER_ONE,
      standId: STAND,
      availability: 'online' as const,
      queuedAt: 9_007_199_254_740_993n,
    },
  };
  const row = { ...toDriverQueueRow(record), version: 4 };
  const restored = fromDriverQueueRow(row);
  expect(restored).toEqual({ value: record, version: 4 });
  expect(row.queued_at_epoch_microseconds).toBe('9007199254740993');
});
