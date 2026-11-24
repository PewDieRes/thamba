import type { RideOffer } from '@domain/dispatch/ride-offer';
import type { BookingId, DriverId, RideOfferId } from '@domain/shared/ids.value-object';
import type { BookingScope } from '@domain/town/town';

export interface RecordedRideOffer extends BookingScope {
  readonly offer: RideOffer;
  readonly status: 'pending' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
}
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface RideOfferRepository {
  get(id: RideOfferId): Promise<Versioned<RecordedRideOffer> | undefined>;
  listByBooking(bookingId: BookingId): Promise<readonly RecordedRideOffer[]>;
  findPendingByDriver(driverId: DriverId): Promise<Versioned<RecordedRideOffer> | undefined>;
  save(value: RecordedRideOffer, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
