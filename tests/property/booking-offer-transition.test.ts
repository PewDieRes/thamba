import fc from 'fast-check';
import { assert, expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import type { BookingEvent } from '@domain/dispatch/booking-events';
import { RideOffer } from '@domain/dispatch/ride-offer';
import { createLandmarkId, createRouteId } from '@domain/shared/ids.value-object';
import * as f from '../unit/domain/dispatch/booking.fixtures';
import { PROPERTY_RUNS } from './property-runs.fixtures';

const DISPATCH_DURATION_IN_MILLISECONDS = 30;
const SHORT_OFFER_TIMEOUT_IN_MILLISECONDS = 14;

const decisions = fc.record({
  townMode: fc.constantFrom('information_only', 'simulated', 'live'),
  hasSyntheticContext: fc.boolean(),
  hasMatchingRun: fc.boolean(),
  issueAtMilliseconds: fc.integer({ min: 1, max: 3 }),
  responseDelayMilliseconds: fc.integer({ min: 0, max: DISPATCH_DURATION_IN_MILLISECONDS }),
  licenceStartMilliseconds: fc.integer({ min: -2, max: 2 }),
  licenceDurationMilliseconds: fc.integer({ min: 1, max: DISPATCH_DURATION_IN_MILLISECONDS }),
});

type DecisionCase = typeof decisions extends fc.Arbitrary<infer T> ? T : never;

function canBookAt(config: DecisionCase, atInMilliseconds: number): boolean {
  if (config.townMode === 'simulated') return config.hasSyntheticContext && config.hasMatchingRun;
  return (
    config.townMode === 'live' &&
    atInMilliseconds >= config.licenceStartMilliseconds &&
    atInMilliseconds < config.licenceStartMilliseconds + config.licenceDurationMilliseconds
  );
}

it('I1 requires authority independently at request, allocation and acceptance', () => {
  fc.assert(
    fc.property(decisions, (config) => {
      const scope =
        config.townMode === 'simulated' && config.hasMatchingRun
          ? { townId: f.townId, demoRunId: f.demoRunId }
          : f.scope;
      const request = Booking.request(
        {
          ...f.request,
          scope,
          quote: { ...f.quote, scope },
          canBook: canBookAt(config, 0),
        },
        f.at(0),
      );
      expect(request.ok).toBe(canBookAt(config, 0));
      if (!request.ok) return;

      const issuedAt = config.issueAtMilliseconds;
      const canIssue = canBookAt(config, issuedAt);
      const issued = request.value.booking.issueOffer(
        { ...f.issue, canBook: canIssue },
        f.at(issuedAt),
      );
      expect(issued.ok).toBe(canIssue);
      if (!issued.ok) return;

      const acceptedAt = issuedAt + config.responseDelayMilliseconds;
      const accepted = issued.value.booking.acceptOffer(
        { ...f.accept, canBook: canBookAt(config, acceptedAt) },
        f.at(acceptedAt),
      );
      expect(accepted.ok).toBe(canBookAt(config, acceptedAt));
    }),
    { numRuns: PROPERTY_RUNS },
  );
});

function assertOfferPrivacy(events: readonly BookingEvent[], protectedValues: readonly string[]) {
  for (const event of events) {
    if (event.type !== 'RideOfferCreated') continue;
    const serializedEvent = JSON.stringify(event);
    expect(serializedEvent).not.toMatch(
      /"(?:destinationLandmarkId|routeId|fare|fareChartVersion|amount|paise|riderId)":/,
    );
    for (const protectedValue of protectedValues) {
      expect(serializedEvent).not.toContain(protectedValue);
    }
  }
}

it('I2 omits protected Route, fare and Rider information from the offer-created event', () => {
  fc.assert(
    fc.property(
      fc.uuid(),
      fc.uuid(),
      fc.integer({ min: 1, max: 100_000 }),
      (destination, route, farePaise) => {
        const fare = {
          ...f.quote.fare,
          amount: f.money(farePaise),
          route: {
            ...f.route,
            destinationLandmarkId: f.unwrap(createLandmarkId(destination)),
            routeId: f.unwrap(createRouteId(route)),
          },
        };
        const booking = f.unwrap(
          Booking.request({ ...f.request, quote: { ...f.quote, fare } }, f.at(0)),
        ).booking;
        const offered = f.unwrap(booking.issueOffer(f.issue, f.at(1)));
        expect(offered.events.map((event) => event.type)).toEqual(['RideOfferCreated']);
        assertOfferPrivacy(offered.events, [
          fare.route.destinationLandmarkId,
          fare.route.routeId,
          f.riderId,
        ]);
        const accepted = f.unwrap(offered.booking.acceptOffer(f.accept, f.at(2)));
        expect(accepted.events).toContainEqual(
          expect.objectContaining({ type: 'TripCreated', fare }),
        );
      },
    ),
    { numRuns: PROPERTY_RUNS },
  );
});

function issueWithTimeout(isCapped: boolean) {
  const requested = f.unwrap(
    Booking.request(
      { ...f.request, dispatchDuration: f.duration(DISPATCH_DURATION_IN_MILLISECONDS) },
      f.at(0),
    ),
  ).booking;
  const dispatchDeadline = requested.state.dispatchDeadline;
  assert(dispatchDeadline);
  const now = f.at(1);
  const timeoutInMilliseconds = isCapped
    ? DISPATCH_DURATION_IN_MILLISECONDS
    : SHORT_OFFER_TIMEOUT_IN_MILLISECONDS;
  const offer = f.unwrap(
    RideOffer.issue({
      ...f.offer,
      bookingId: f.bookingId,
      now,
      dispatchDeadline,
      offerTimeout: f.duration(timeoutInMilliseconds),
    }),
  );
  const expiresAt = isCapped
    ? DISPATCH_DURATION_IN_MILLISECONDS
    : 1 + SHORT_OFFER_TIMEOUT_IN_MILLISECONDS;
  expect(offer.expiresAt.epochMilliseconds).toBe(expiresAt);
  return {
    offering: f.unwrap(requested.issueOffer({ ...f.canBook, offer }, now)).booking,
    expiresAt,
  };
}

it('I5 forbids acceptance at either deadline, including before an expiry sweep', () => {
  fc.assert(
    fc.property(fc.boolean(), fc.integer({ min: -2, max: 2 }), (isCapped, offsetInMilliseconds) => {
      const { offering, expiresAt } = issueWithTimeout(isCapped);
      const now = f.at(expiresAt + offsetInMilliseconds);
      const accepted = offering.acceptOffer(f.accept, now);
      expect(accepted.ok).toBe(offsetInMilliseconds < 0);
      if (offsetInMilliseconds < 0) return;

      expect(accepted).toEqual({ ok: false, error: { code: 'offer_expired' } });
      const closed = f.unwrap(
        isCapped ? offering.endOffering(f.canBook, now) : offering.closeOffer(f.expire, now),
      );
      expect(closed.events.map((event) => event.type)).toEqual(
        isCapped ? ['RideOfferExpired', 'BookingNoDriverFound'] : ['RideOfferExpired'],
      );
      expect(closed.booking.acceptOffer(f.accept, now).ok).toBe(false);
      expect(closed.booking.state.trip).toBeUndefined();
    }),
    { numRuns: PROPERTY_RUNS },
  );
});
