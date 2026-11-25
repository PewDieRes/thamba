import { expect, test } from 'vitest';
import { BOOKING } from '../../../contract/contract-data.fixtures';
import { toBookingRow, fromBookingRow } from '@infrastructure/supabase/booking.mapper';
import { domainValues } from '@infrastructure/composition/domain-values';

test('rehydrates a requested Booking with its fare and captured Stand order', () => {
  const row = { ...toBookingRow(BOOKING, domainValues.bookingDueAt), version: 3 };
  const restored = fromBookingRow(row, domainValues);
  expect(restored).toEqual({ value: BOOKING, version: 3 });
  expect(restored.value.state.dispatchDeadline?.epochMilliseconds).toBe(
    BOOKING.state.dispatchDeadline?.epochMilliseconds,
  );
});
