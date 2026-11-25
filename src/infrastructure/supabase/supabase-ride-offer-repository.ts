import type {
  RideOfferRepository,
  RecordedRideOffer,
} from '@application/ports/ride-offer-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { BookingId, DriverId, RideOfferId } from '@domain/shared/ids.value-object';
import type { DomainValues } from './domain-values';
import { fromRideOfferRow, toRideOfferRow } from './ride-offer.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseRideOfferRepository implements RideOfferRepository {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: DomainValues,
  ) {}

  async get(id: RideOfferId) {
    const row = await getRow(this.storage, 'offers', { id: id });
    return row && fromRideOfferRow(row, this.domain);
  }

  async listByBooking(bookingId: BookingId) {
    const rows = await this.storage.list('offers', { booking_id: bookingId });
    return rows.map((row) => fromRideOfferRow(row, this.domain).value);
  }

  async findPendingByDriver(driverId: DriverId) {
    const row = await getRow(this.storage, 'offers', { driver_id: driverId, status: 'pending' });
    return row && fromRideOfferRow(row, this.domain);
  }

  save(value: RecordedRideOffer, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'offers',
      key: { id: value.offer.offerId },
      row: toRideOfferRow(value),
      expectedVersion,
    });
  }
}
