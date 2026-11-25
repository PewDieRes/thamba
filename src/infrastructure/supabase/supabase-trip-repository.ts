import type { TripRepository } from '@application/ports/trip-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { BookingId, DriverId } from '@domain/shared/ids.value-object';
import type { Trip } from '@domain/trip/trip';
import type { DomainValues } from './domain-values';
import { fromTripRow, toTripRow } from './trip.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseTripRepository implements TripRepository {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: DomainValues,
  ) {}

  async get(id: BookingId) {
    const row = await getRow(this.storage, 'trips', { booking_id: id });
    return row && fromTripRow(row, this.domain);
  }

  async findActiveByDriver(driverId: DriverId) {
    const row = await getRow(this.storage, 'trips', {
      driver_id: driverId,
      status: ['accepted', 'driver_arrived', 'in_trip'],
    });
    return row && fromTripRow(row, this.domain);
  }

  save(value: Trip, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'trips',
      key: { booking_id: value.bookingId },
      row: toTripRow(value),
      expectedVersion,
    });
  }
}
