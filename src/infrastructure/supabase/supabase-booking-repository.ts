import type { BookingRepository } from '@application/ports/booking-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { BookingId, RiderId } from '@domain/shared/ids.value-object';
import type { Booking } from '@domain/dispatch/booking';
import type { DomainValues } from './domain-values';
import { fromBookingRow, toBookingRow } from './booking.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseBookingRepository implements BookingRepository {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: DomainValues,
    private readonly activeStatuses: readonly string[],
  ) {}

  async get(id: BookingId) {
    const row = await getRow(this.storage, 'bookings', { id: id });
    return row && fromBookingRow(row, this.domain);
  }

  async countActiveByRider(riderId: RiderId) {
    const active = await this.storage.list('bookings', {
      rider_user_id: riderId,
      status: this.activeStatuses,
    });
    return active.length;
  }

  save(value: Booking, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'bookings',
      key: { id: value.state.bookingId },
      row: toBookingRow(value, this.domain.bookingDueAt),
      expectedVersion,
    });
  }
}
