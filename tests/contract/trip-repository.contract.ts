import type { TripRepository } from '@application/ports/trip-repository';
import { expect, test } from 'vitest';
import { BOOKING_ID, OTHER_BOOKING_ID, TRIP } from './contract-data.fixtures';
import { DRIVER_ONE, NOW } from '../unit/application/demo-data.fixtures';
import {
  CONFLICT,
  SAVED,
  type AdapterFactory,
  versionedRepositoryContract,
} from './versioned-repository.fixtures';

export function tripRepositoryContract(make: AdapterFactory<TripRepository>) {
  versionedRepositoryContract({
    name: 'TripRepository',
    make,
    id: BOOKING_ID,
    first: TRIP,
    updated: { ...TRIP, status: 'completed', endedAt: NOW },
  });
  test('TripRepository releases the active Driver slot at closeout', async () => {
    const repo = await make();
    const next = { ...TRIP, bookingId: OTHER_BOOKING_ID };
    expect(await repo.save(TRIP, null)).toEqual(SAVED);
    expect(await repo.save(next, null)).toEqual(CONFLICT);
    expect(await repo.findActiveByDriver(DRIVER_ONE)).toEqual({ version: 1, value: TRIP });
    expect(
      await repo.save(
        { ...TRIP, status: 'cancelled_by_driver', reason: 'cancelled_by_driver', endedAt: NOW },
        1,
      ),
    ).toEqual(SAVED);
    expect(await repo.findActiveByDriver(DRIVER_ONE)).toBeUndefined();
    expect(await repo.save(next, null)).toEqual(SAVED);
  });
}
