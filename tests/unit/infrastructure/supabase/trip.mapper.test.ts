import { expect, test } from 'vitest';
import { domainValues } from '@infrastructure/composition/domain-values';
import { fromTripRow, toTripRow } from '@infrastructure/supabase/trip.mapper';
import { TRIP } from '../../../contract/contract-data.fixtures';
import { NOW } from '../../application/demo-data.fixtures';

test('round trips the trip row with its storage version', () => {
  const record = {
    ...TRIP,
    status: 'cancelled_by_driver' as const,
    reason: 'cancelled_by_driver' as const,
    endedAt: NOW,
  };
  const row = { ...toTripRow(record), version: 4 };
  const restored = fromTripRow(row, domainValues);
  expect(restored).toEqual({ value: record, version: 4 });
  expect(row.ended_at).toBe(new Date(NOW.epochMilliseconds).toISOString());
});
