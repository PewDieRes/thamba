import type { Booking } from '@domain/dispatch/booking';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface BookingRepository {
  get(id: BookingId): Promise<Versioned<Booking> | undefined>;
  save(value: Booking, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
