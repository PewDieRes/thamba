import type { getBookingDueAt } from '@domain/dispatch/booking-state';
import type { Booking } from '@domain/dispatch/booking';
import type { RideOffer } from '@domain/dispatch/ride-offer';
import type { Duration } from '@domain/shared/duration.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { Money } from '@domain/shared/money.value-object';
import type { PassengerCount } from '@domain/shared/passenger-count.value-object';
import type { createLicence } from '@domain/town/licence';
import type { Town } from '@domain/town/town';

export interface DomainValues {
  readonly bookingDueAt: typeof getBookingDueAt;
  readonly booking: typeof Booking.restore;
  readonly offer: typeof RideOffer.issue;
  readonly town: typeof Town.restore;
  readonly licence: typeof createLicence;
  readonly duration: typeof Duration.fromMilliseconds;
  readonly instant: typeof Instant.fromEpochMilliseconds;
  readonly money: typeof Money.fromPaise;
  readonly passengers: typeof PassengerCount.fromCount;
}
