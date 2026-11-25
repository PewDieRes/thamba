import type { BookingState } from '@domain/dispatch/booking-state';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { ApplicationResult } from './application-result';

import type { MatchedDriverView } from '../contracts/rider-status-view';

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
> & { readonly matchedDriver?: MatchedDriverView };

export interface RiderBookingReader {
  get(
    bookingId: BookingId,
  ): Promise<ApplicationResult<RiderBookingRecord | undefined>> & {
    readonly matchedDriver?: MatchedDriverView;
  };
}
