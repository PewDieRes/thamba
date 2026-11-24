import type { DomainError } from '../shared/domain.error';
import type {
  BookingId,
  DemoRunId,
  DriverId,
  LandmarkId,
  RiderId,
  RideOfferId,
  RouteId,
  StandId,
  TownId,
  TripId,
} from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import type { Money } from '../shared/money.value-object';
import type { BookingStatus } from './booking-status';

export interface BookingScope {
  readonly townId: TownId;
  readonly demoRunId?: DemoRunId;
}

export interface BookingRoute {
  readonly routeId: RouteId;
  readonly pickupLandmarkId: LandmarkId;
  readonly destinationLandmarkId: LandmarkId;
}

export interface BookingFare {
  readonly route: BookingRoute;
  readonly amount: Money;
  readonly fareChartVersion: number;
}

export interface PendingBookingOffer {
  readonly offerId: RideOfferId;
  readonly driverId: DriverId;
  readonly standId: StandId;
  readonly expiresAt: Instant;
}

export interface BookingTrip {
  readonly tripId: TripId;
  readonly driverId: DriverId;
  readonly standId: StandId;
  readonly arrivedAt?: Instant;
  readonly pickedUpAt?: Instant;
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
  readonly trip?: BookingTrip | undefined;
  readonly noDriverFoundReason?: NoDriverFoundReason;
}

export type BookingTransitionError = DomainError<
  | 'illegal_transition'
  | 'quote_scope_mismatch'
  | 'stale_quote'
  | 'booking_unavailable'
  | 'pickup_not_in_future'
  | 'invalid_request_due_at'
  | 'schedule_not_due'
  | 'invalid_dispatch_deadline'
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
>;
