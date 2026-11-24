import type { BookingRepository } from '@application/ports/booking-repository';
import { BOOKING, BOOKING_ID } from './contract-data.fixtures';
import { NOW, RIDER } from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { type AdapterFactory, versionedRepositoryContract } from './versioned-repository.fixtures';

export function bookingRepositoryContract(make: AdapterFactory<BookingRepository>) {
  versionedRepositoryContract({
    name: 'BookingRepository',
    make,
    id: BOOKING_ID,
    first: BOOKING,
    updated: unwrap(BOOKING.cancelByRider(RIDER, NOW)).booking,
  });
}
