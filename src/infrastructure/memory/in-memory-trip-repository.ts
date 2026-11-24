import type { DriverId } from '@domain/shared/ids.value-object';
import type { Trip } from '@domain/trip/trip';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { TripRepository } from '@application/ports/trip-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryTripRepository implements TripRepository {
  constructor(private readonly table = new MemoryTable<Trip>()) {}

  get(id: BookingId) {
    return Promise.resolve(this.table.get(id));
  }

  findActiveByDriver(driverId: DriverId) {
    return Promise.resolve(
      this.table.list().find(({ value }) => value.driverId === driverId && !('endedAt' in value)),
    );
  }

  save(value: Trip, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.bookingId;
    const current = this.table.get(id);
    if ((current && current.value.tripId !== value.tripId) || this.hasConflictingTrip(value)) {
      return Promise.resolve({ ok: false, error: { code: 'ConcurrencyConflict' } });
    }

    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }

  private hasConflictingTrip(value: Trip): boolean {
    if ('endedAt' in value) return false;
    return this.table
      .list()
      .some(
        ({ value: existing }) =>
          existing.bookingId !== value.bookingId &&
          existing.driverId === value.driverId &&
          !('endedAt' in existing),
      );
  }
}
