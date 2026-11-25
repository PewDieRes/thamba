import { getBookingDueAt } from '@domain/dispatch/booking-state';
import { Booking } from '@domain/dispatch/booking';
import { RideOffer } from '@domain/dispatch/ride-offer';
import { Duration } from '@domain/shared/duration.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { Money } from '@domain/shared/money.value-object';
import { PassengerCount } from '@domain/shared/passenger-count.value-object';
import { Town } from '@domain/town/town';
import { createLicence } from '@domain/town/licence';
import type { PayloadValues } from '../supabase/payload.mapper';

export const domainValues: PayloadValues = {
  bookingDueAt: getBookingDueAt,
  isInstant: (value): value is Instant => value instanceof Instant,
  isMoney: (value): value is Money => value instanceof Money,
  booking: (state) => Booking.restore(state),
  offer: (input) => RideOffer.issue(input),
  town: (input, mode) => Town.restore(input, mode),
  licence: createLicence,
  duration: (value) => Duration.fromMilliseconds(value),
  instant: (value) => Instant.fromEpochMilliseconds(value),
  money: (value) => Money.fromPaise(value),
  passengers: (value, max) => PassengerCount.fromCount(value, max),
};

export function toInstant(milliseconds: number): Instant {
  const instant = Instant.fromEpochMilliseconds(milliseconds);
  if (!instant.ok) throw new RangeError('The system clock returned an invalid instant');
  return instant.value;
}
