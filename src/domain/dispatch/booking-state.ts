import type { DriverSessionError } from '../identity/driver-device';
import type { DomainError } from '../shared/domain.error';
import type {
  BookingId,
  DriverId,
  RiderId,
  RideOfferId,
  StandId,
} from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import type { BookingScope } from '../town/town';
import type { ActiveTrip } from '../trip/trip';
import type { BookingStatus } from './booking-status';
import type { BookingFare } from './booking-terms';

export type { Route as BookingRoute } from '../fares/fare-chart';
export type { BookingScope } from '../town/town';
export type { BookingFare } from './booking-terms';

export interface PendingBookingOffer {
  readonly offerId: RideOfferId;
  readonly driverId: DriverId;
  readonly standId: StandId;
  readonly expiresAt: Instant;
}

export type NoDriverFoundReason = 'dispatch_deadline' | 'booking_unavailable' | 'stands_exhausted';

export interface BookingState extends BookingScope {
  readonly bookingId: BookingId;
  readonly riderId: RiderId;
  readonly standId: StandId;
  readonly fare: BookingFare;
  readonly status: BookingStatus;
  readonly pickupAt?: Instant;
  readonly requestDueAt?: Instant;
  readonly requestedAt?: Instant;
  readonly dispatchDeadline?: Instant;
  readonly searchStandIds?: readonly StandId[];
  readonly offer?: PendingBookingOffer | undefined;
  readonly trip?: ActiveTrip | undefined;
  readonly noDriverFoundReason?: NoDriverFoundReason;
}

export type BookingTransitionError =
  | DomainError<
      | 'illegal_transition'
      | 'quote_scope_mismatch'
      | 'stale_quote'
      | 'booking_unavailable'
      | 'pickup_not_in_future'
      | 'invalid_request_due_at'
      | 'schedule_not_due'
      | 'invalid_dispatch_deadline'
      | 'invalid_stand_search_cap'
      | 'dispatch_deadline'
      | 'dispatch_still_open'
      | 'stand_outside_search'
      | 'stand_mismatch'
      | 'invalid_offer_expiry'
      | 'offer_mismatch'
      | 'offer_expired'
      | 'offer_not_due'
      | 'driver_mismatch'
      | 'driver_not_reserved'
      | 'rider_mismatch'
    >
  | DriverSessionError;

export function getBookingDueAt(state: BookingState) {
  switch (state.status) {
    case 'scheduled':
      return state.requestDueAt;
    case 'requested':
      return state.requestedAt;
    case 'offering':
      return state.offer?.expiresAt;
    default:
      return undefined;
  }
}
