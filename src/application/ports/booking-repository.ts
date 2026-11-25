import type { Booking } from '@domain/dispatch/booking';
import type { BookingId, RiderId } from '@domain/shared/ids.value-object';
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface BookingRepository {
  get(id: BookingId): Promise<Versioned<Booking> | undefined>;
  countActiveByRider(riderId: RiderId): Promise<number>;
  save(value: Booking, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
