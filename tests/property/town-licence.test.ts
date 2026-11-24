import fc from 'fast-check';
import { expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import { createLicence } from '@domain/town/licence';
import { evaluateBookingCapability, Town } from '@domain/town/town';
import * as f from '../unit/domain/dispatch/booking.fixtures';

const licence = f.unwrap(
  createLicence({
    ulin: 'TEST-ULIN',
    issuingAuthority: 'Test Authority',
    validFromDate: '2026-11-24',
    validThroughDate: '2026-11-24',
  }),
);
const endsInMilliseconds = licence.endsAt.epochMilliseconds;
const initialTime = f.at(endsInMilliseconds - 1_000);
const laterTime = f.at(endsInMilliseconds + 1_000);
const live = f.unwrap(
  Town.create({ townId: f.townId, licence }).withBookingMode('live', initialTime),
);
const request = { ...f.request, quote: { ...f.quote, expiresAt: laterTime } };
const issue = { ...f.issue, offer: { ...f.offer, expiresAt: laterTime } };
const requested = f.unwrap(Booking.request(request, initialTime)).booking;
const offering = f.unwrap(requested.issueOffer(issue, initialTime)).booking;
const scheduled = f.unwrap(
  Booking.schedule({ ...request, pickupAt: laterTime }, initialTime),
).booking;

it('I1 rechecks live Town authority at request, activation, allocation and acceptance', () => {
  const millisecondsFromExpiry = fc.oneof(
    fc.constantFrom(-1, 0),
    fc.integer({ min: -999, max: 999 }),
  );
  fc.assert(
    fc.property(millisecondsFromExpiry, (offsetMilliseconds) => {
      const now = f.at(endsInMilliseconds + offsetMilliseconds);
      const authority = { canBook: evaluateBookingCapability(live, now).kind === 'live' };
      const expected = offsetMilliseconds < 0;
      const decisions = [
        Booking.request({ ...request, ...authority }, now),
        scheduled.activate(authority, now),
        requested.issueOffer({ ...issue, ...authority }, now),
        offering.acceptOffer({ ...f.accept, ...authority }, now),
      ];
      for (const decision of decisions) {
        if (expected) expect(decision.ok).toBe(true);
        else expect(decision).toEqual({ ok: false, error: { code: 'booking_unavailable' } });
      }
    }),
  );
});
