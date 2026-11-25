import { expect, test } from 'vitest';
import { createRiderId } from '@domain/shared/ids.value-object';
import type { BookingRepository } from '@application/ports/booking-repository';
import { BOOKING, BOOKING_ID } from './contract-data.fixtures';
import { NOW, RIDER } from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { type AdapterFactory, versionedRepositoryContract } from './versioned-repository.fixtures';

export function bookingRepositoryContract(make: AdapterFactory<BookingRepository>) {
  const cancelled = unwrap(BOOKING.cancelByRider(RIDER, NOW)).booking;
  versionedRepositoryContract({
    name: 'BookingRepository',
    make,
    id: BOOKING_ID,
    first: BOOKING,
    updated: cancelled,
  });
  test('counts only active Bookings belonging to the given Rider', async () => {
    const repository = await make();
    const other = unwrap(createRiderId('20000000-0000-4000-8000-000000000004'));
    expect(await repository.countActiveByRider(RIDER)).toBe(0);
    unwrap(await repository.save(BOOKING, null));
    expect(await repository.countActiveByRider(RIDER)).toBe(1);
    expect(await repository.countActiveByRider(other)).toBe(0);
    unwrap(await repository.save(cancelled, 1));
    expect(await repository.countActiveByRider(RIDER)).toBe(0);
  });
}
