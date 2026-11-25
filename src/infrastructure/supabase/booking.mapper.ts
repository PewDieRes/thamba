import type { RiderBookingRecord } from '@application/ports/rider-booking-reader';
import type { Booking } from '@domain/dispatch/booking';
import type { BookingState, PendingBookingOffer } from '@domain/dispatch/booking-state';
import type { ActiveTrip } from '@domain/trip/trip';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';
import {
  mapOptional,
  readInstant,
  readOptionalInstant,
  readRoute,
  readScope,
  unpack,
  versioned,
  writeInstant,
  writeRoute,
  writeScope,
  type RouteRow,
} from './row.mapper';
import { fromTripRow, toTripRow, type TripRow } from './trip.mapper';

type PendingOfferRow = Pick<Tables<'ride_offers'>, 'id' | 'driver_id' | 'stand_id' | 'expires_at'>;

export type BookingRow = Pick<
  Tables<'bookings'>,
  | 'id'
  | 'town_id'
  | 'demo_run_id'
  | 'rider_user_id'
  | 'stand_id'
  | 'chart_version'
  | 'status'
  | 'no_driver_found_reason'
  | 'pickup_at'
  | 'request_due_at'
  | 'requested_at'
  | 'dispatch_deadline_at'
  | 'pending_offer_id'
  | 'next_due_at'
  | 'fare_in_paise'
  | 'version'
> &
  RouteRow & {
    search_stand_ids: string[] | null;
    pending_offer: PendingOfferRow | null;
    active_trip: TripRow | null;
  };

function readPendingOffer(row: PendingOfferRow | null, domain: DomainValues) {
  if (!row) return undefined;
  return {
    offerId: row.id as PendingBookingOffer['offerId'],
    driverId: row.driver_id as PendingBookingOffer['driverId'],
    standId: row.stand_id as PendingBookingOffer['standId'],
    expiresAt: readInstant(row.expires_at, domain),
  };
}

export function fromBookingRow(row: BookingRow, domain: DomainValues) {
  const activeTrip = row.active_trip && fromTripRow(row.active_trip, domain).value;
  const state: BookingState = {
    ...fromRiderBookingRow(row, domain),
    ...readOptionalInstant('requestDueAt', row.request_due_at, domain),
    ...readOptionalInstant('requestedAt', row.requested_at, domain),
    ...readOptionalInstant('dispatchDeadline', row.dispatch_deadline_at, domain),
    ...mapOptional(
      'searchStandIds',
      row.search_stand_ids?.map((id) => id as BookingState['standId']),
    ),
    ...mapOptional('offer', readPendingOffer(row.pending_offer, domain)),
    ...mapOptional('trip', activeTrip as ActiveTrip | null),
  };
  return versioned(row, domain.booking(state));
}

export function toBookingRow(
  { state }: Booking,
  getDueAt: DomainValues['bookingDueAt'],
): Omit<BookingRow, 'version'> {
  const { offer, trip } = state;
  return {
    ...writeScope(state),
    id: state.bookingId,
    rider_user_id: state.riderId,
    stand_id: state.standId,
    ...writeRoute(state.fare.route),
    chart_version: state.fare.fareChartVersion,
    fare_in_paise: state.fare.amount.paise,
    status: state.status,
    no_driver_found_reason: state.noDriverFoundReason ?? null,
    pickup_at: writeInstant(state.pickupAt),
    request_due_at: writeInstant(state.requestDueAt),
    requested_at: writeInstant(state.requestedAt),
    dispatch_deadline_at: writeInstant(state.dispatchDeadline),
    next_due_at: writeInstant(getDueAt(state)),
    pending_offer_id: offer?.offerId ?? null,
    search_stand_ids: state.searchStandIds ? [...state.searchStandIds] : null,
    pending_offer: offer
      ? {
          id: offer.offerId,
          driver_id: offer.driverId,
          stand_id: offer.standId,
          expires_at: new Date(offer.expiresAt.epochMilliseconds).toISOString(),
        }
      : null,
    active_trip: trip ? { ...toTripRow(trip), version: 1 } : null,
  };
}

export type RiderBookingRow = Pick<
  BookingRow,
  | 'id'
  | 'town_id'
  | 'demo_run_id'
  | 'rider_user_id'
  | 'stand_id'
  | 'chart_version'
  | 'fare_in_paise'
  | 'status'
  | 'pickup_at'
  | 'no_driver_found_reason'
> &
  RouteRow;

export function fromRiderBookingRow(
  row: RiderBookingRow,
  domain: DomainValues,
): RiderBookingRecord {
  return {
    ...readScope(row.town_id, row.demo_run_id),
    bookingId: row.id as BookingState['bookingId'],
    riderId: row.rider_user_id as BookingState['riderId'],
    standId: row.stand_id as BookingState['standId'],
    status: row.status as BookingState['status'],
    fare: {
      route: readRoute(row),
      fareChartVersion: row.chart_version,
      amount: unpack(domain.money(row.fare_in_paise)),
    },
    ...readOptionalInstant('pickupAt', row.pickup_at, domain),
    ...mapOptional(
      'noDriverFoundReason',
      row.no_driver_found_reason as BookingState['noDriverFoundReason'],
    ),
  };
}
