import { Booking } from '@domain/dispatch/booking';
import { RideOffer } from '@domain/dispatch/ride-offer';
import { quoteFare } from '@domain/fares/quote-fare';
import { createInviteTokenHash } from '@domain/identity/driver-invite';
import {
  createBookingId,
  createFareQuoteId,
  createRideOfferId,
  createTripId,
} from '@domain/shared/ids.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { createTrip } from '@domain/trip/trip';
import {
  DEMO_TOWN,
  DESTINATION,
  DRIVER_ONE,
  FARE_CHART,
  NOW,
  NOW_MS,
  PICKUP,
  RIDER,
  SCOPE,
  STAND,
  uuid,
} from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';

const AT_DEADLINE_MS = 90_000;
export const DEADLINE = unwrap(Instant.fromEpochMilliseconds(NOW_MS + AT_DEADLINE_MS));
export const BOOKING_ID = unwrap(createBookingId(uuid(100)));
export const OTHER_BOOKING_ID = unwrap(createBookingId(uuid(101)));
export const QUOTE_ID = unwrap(createFareQuoteId(uuid(102)));
export const OFFER_ID = unwrap(createRideOfferId(uuid(103)));
export const OTHER_OFFER_ID = unwrap(createRideOfferId(uuid(104)));
export const TRIP_ID = unwrap(createTripId(uuid(105)));
export const TOKEN_HASH = unwrap(createInviteTokenHash('f'.repeat(64)));

export const QUOTE = unwrap(
  quoteFare(
    {
      town: DEMO_TOWN.town,
      chart: FARE_CHART,
      riderId: RIDER,
      demoRun: SCOPE,
      pickupLandmarkId: PICKUP,
      destinationLandmarkId: DESTINATION,
      passengers: 1,
      expiresAt: DEADLINE,
    },
    NOW,
  ),
);

const FARE = { route: QUOTE.route, fareChartVersion: QUOTE.chartVersion, amount: QUOTE.amount };

export const BOOKING = unwrap(
  Booking.request(
    {
      bookingId: BOOKING_ID,
      standId: STAND,
      riderId: RIDER,
      scope: SCOPE,
      currentFareChartVersion: FARE_CHART.version,
      canBook: true,
      quote: { riderId: RIDER, scope: SCOPE, expiresAt: DEADLINE, fare: FARE },
    },
    NOW,
  ),
).booking;

export const OFFER = unwrap(
  RideOffer.issue({
    bookingId: BOOKING_ID,
    offerId: OFFER_ID,
    driverId: DRIVER_ONE,
    standId: STAND,
    now: NOW,
    dispatchDeadline: DEADLINE,
  }),
);

export const TRIP = createTrip(
  {
    ...SCOPE,
    bookingId: BOOKING_ID,
    tripId: TRIP_ID,
    standId: STAND,
    driverId: DRIVER_ONE,
    riderId: RIDER,
    fare: FARE,
  },
  NOW,
).trip;
