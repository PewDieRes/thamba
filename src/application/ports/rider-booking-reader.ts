import type { BookingState } from '@domain/dispatch/booking-state';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { ApplicationResult } from './application-result';

export type RiderBookingRecord = Pick<
  BookingState,
  | 'bookingId'
  | 'riderId'
  | 'townId'
  | 'demoRunId'
  | 'standId'
  | 'status'
  | 'fare'
  | 'pickupAt'
  | 'noDriverFoundReason'
>;

export interface RiderBookingReader {
  get(bookingId: BookingId): Promise<ApplicationResult<RiderBookingRecord | undefined>>;
}
