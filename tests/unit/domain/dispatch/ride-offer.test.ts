import { expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import { RideOffer } from '@domain/dispatch/ride-offer';
import { createBookingId } from '@domain/shared/ids.value-object';
import * as f from './booking.fixtures';

const assignment = {
  bookingId: f.bookingId,
  offerId: f.offerId,
  driverId: f.driverId,
  standId: f.standId,
};

it('uses the default offer timeout and treats equality as expired', () => {
  const offer = f.unwrap(
    RideOffer.issue({
      ...assignment,
      now: f.at(0),
      dispatchDeadline: f.at(f.DEFAULT_DISPATCH_IN_MILLISECONDS),
    }),
  );

  expect(offer.expiresAt.epochMilliseconds).toBe(f.MINUTE_IN_MILLISECONDS);
  expect(offer.isExpired(f.at(f.MINUTE_IN_MILLISECONDS - 1))).toBe(false);
  expect(offer.isExpired(f.at(f.MINUTE_IN_MILLISECONDS))).toBe(true);
  expect(offer.isExpired(f.at(f.MINUTE_IN_MILLISECONDS + 1))).toBe(true);
});

it.each([
  { timeoutMilliseconds: 10_000, deadlineMilliseconds: 90_000, expiryMilliseconds: 10_001 },
  { timeoutMilliseconds: 60_000, deadlineMilliseconds: 5_000, expiryMilliseconds: 5_000 },
  {
    timeoutMilliseconds: Number.MAX_SAFE_INTEGER,
    deadlineMilliseconds: 5_000,
    expiryMilliseconds: 5_000,
  },
])('uses the earlier of the configured timeout and dispatch deadline', (example) => {
  const offer = f.unwrap(
    RideOffer.issue({
      ...assignment,
      now: f.at(1),
      dispatchDeadline: f.at(example.deadlineMilliseconds),
      offerTimeout: f.duration(example.timeoutMilliseconds),
    }),
  );

  expect(offer.expiresAt.epochMilliseconds).toBe(example.expiryMilliseconds);
});

it('rejects an issuance at the dispatch deadline or with a zero-length timeout', () => {
  const now = f.at(0);
  expect(RideOffer.issue({ ...assignment, now, dispatchDeadline: now })).toEqual({
    ok: false,
    error: { code: 'dispatch_deadline' },
  });
  expect(
    RideOffer.issue({
      ...assignment,
      now,
      dispatchDeadline: f.at(1),
      offerTimeout: f.duration(0),
    }),
  ).toEqual({ ok: false, error: { code: 'invalid_offer_expiry' } });
});

it('binds an issued Ride offer to its Booking', () => {
  const now = f.at(0);
  const rideOffer = f.unwrap(
    RideOffer.issue({
      ...assignment,
      now,
      dispatchDeadline: f.at(f.DEFAULT_DISPATCH_IN_MILLISECONDS),
    }),
  );
  const booking = f.makeRequested();
  expect(booking.issueOffer({ ...f.canBook, offer: rideOffer }, now)).toMatchObject({ ok: true });

  const differentBookingId = f.unwrap(createBookingId(f.otherOfferId));
  const otherBooking = f.unwrap(
    Booking.request({ ...f.request, bookingId: differentBookingId }, now),
  ).booking;
  expect(otherBooking.issueOffer({ ...f.canBook, offer: rideOffer }, now)).toEqual({
    ok: false,
    error: { code: 'offer_mismatch' },
  });
});
