import type { Booking } from '@domain/dispatch/booking';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { BookingRepository } from '@application/ports/booking-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryBookingRepository implements BookingRepository {
  constructor(private readonly table = new MemoryTable<Booking>()) {}

  get(id: BookingId) {
    return Promise.resolve(this.table.get(id));
  }

  save(value: Booking, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.state.bookingId;
    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
