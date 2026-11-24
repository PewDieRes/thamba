import type { BookingId, DriverId } from '@domain/shared/ids.value-object';
import type { Trip } from '@domain/trip/trip';
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface TripRepository {
  get(id: BookingId): Promise<Versioned<Trip> | undefined>;
  findActiveByDriver(driverId: DriverId): Promise<Versioned<Trip> | undefined>;
  save(value: Trip, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
