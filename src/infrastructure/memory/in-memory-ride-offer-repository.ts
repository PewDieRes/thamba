import type { BookingId, DriverId } from '@domain/shared/ids.value-object';
import type { RideOfferId } from '@domain/shared/ids.value-object';
import type {
  RideOfferRepository,
  RecordedRideOffer,
} from '@application/ports/ride-offer-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryRideOfferRepository implements RideOfferRepository {
  constructor(private readonly table = new MemoryTable<RecordedRideOffer>()) {}

  get(id: RideOfferId) {
    return Promise.resolve(this.table.get(id));
  }

  listByBooking(bookingId: BookingId): Promise<readonly RecordedRideOffer[]> {
    return Promise.resolve(
      this.table
        .list()
        .map(({ value }) => value)
        .filter(({ offer }) => offer.bookingId === bookingId),
    );
  }

  findPendingByDriver(driverId: DriverId) {
    return Promise.resolve(
      this.table
        .list()
        .find(({ value }) => value.status === 'pending' && value.offer.driverId === driverId),
    );
  }

  save(value: RecordedRideOffer, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.offer.offerId;
    const other = this.table
      .list()
      .some(
        ({ value: existing }) =>
          existing.offer.offerId !== id &&
          ((existing.offer.bookingId === value.offer.bookingId &&
            existing.offer.driverId === value.offer.driverId) ||
            (value.status === 'pending' &&
              existing.status === 'pending' &&
              (existing.offer.bookingId === value.offer.bookingId ||
                existing.offer.driverId === value.offer.driverId))),
      );
    if (other) return Promise.resolve({ ok: false, error: { code: 'ConcurrencyConflict' } });

    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
