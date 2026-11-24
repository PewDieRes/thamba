import fc from 'fast-check';
import { assert, expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import { planNextDispatchStep } from '@domain/dispatch/dispatch-planner';
import {
  releaseDriverQueueEntry,
  reserveDriverQueueEntry,
} from '@domain/dispatch/driver-queue-entry';
import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { FairRotationPolicy } from '@domain/dispatch/fair-rotation.policy';
import { KeepPositionPolicy } from '@domain/dispatch/keep-position.policy';
import { RideOffer } from '@domain/dispatch/ride-offer';
import { createBookingId } from '@domain/shared/ids.value-object';
import * as f from '../unit/domain/dispatch/booking.fixtures';
import { PROPERTY_RUNS } from './property-runs.fixtures';

const MICROSECONDS_PER_MILLISECOND = 1_000n;
const MAX_QUEUE_TIME_IN_MICROSECONDS = 5n;
const MAX_ISSUE_TIME_IN_MILLISECONDS = 20;
const DISPATCH_DURATION_IN_MILLISECONDS = 30;
const SHORT_OFFER_TIMEOUT_IN_MILLISECONDS = 5;
const competingBookingId = f.unwrap(createBookingId('11111111-1111-1111-1111-111111111111'));
const authority = f.canBook;
const stands = [f.standId, f.otherStandId].map((standId) => ({
  standId,
  townId: f.townId,
  servesPickupArea: true,
}));
const policies = { driverRanking: new FairRotationPolicy() };

const contest = fc.record({
  queuedAt: fc.bigInt({ min: 0n, max: MAX_QUEUE_TIME_IN_MICROSECONDS }),
  gapInMicroseconds: fc.bigInt({ min: 0n, max: MAX_QUEUE_TIME_IN_MICROSECONDS }),
  issuedAtInMilliseconds: fc.integer({ min: 1, max: MAX_ISSUE_TIME_IN_MILLISECONDS }),
});

type PlannerInput = Parameters<typeof planNextDispatchStep>[0];
interface SearchState {
  readonly entries: readonly DriverQueueEntry[];
  readonly now?: PlannerInput['now'];
  readonly offerHistory?: PlannerInput['offerHistory'];
}

function findDriver(booking: Booking, { entries, now = f.at(1), offerHistory = [] }: SearchState) {
  return planNextDispatchStep({
    booking,
    queueSnapshot: { entries, stands, activeTripDriverIds: new Set() },
    now,
    offerHistory,
    authority,
    policies,
  });
}

it('I4 replans when another Booking reserves the Driver selected from the prior snapshot', () => {
  fc.assert(
    fc.property(contest, ({ queuedAt, gapInMicroseconds, issuedAtInMilliseconds }) => {
      const driver = makeDriver(f.standId, queuedAt);
      const otherDriver = {
        driverId: f.otherDriverId,
        standId: f.standId,
        availability: 'online',
        queuedAt: queuedAt + gapInMicroseconds,
      } as const;
      const first = f.makeRequested();
      const second = f.unwrap(
        Booking.request({ ...f.request, bookingId: competingBookingId }, f.at(0)),
      ).booking;
      const before = [otherDriver, driver];
      const now = f.at(issuedAtInMilliseconds);
      expect(findDriver(first, { entries: before, now })).toEqual({
        type: 'offer_to',
        driverId: f.driverId,
      });
      expect(findDriver(second, { entries: before, now })).toEqual({
        type: 'offer_to',
        driverId: f.driverId,
      });

      const wonReservation = f.unwrap(reserveDriverQueueEntry(driver, f.offerId));
      expect(reserveDriverQueueEntry(wonReservation, f.otherOfferId).ok).toBe(false);
      const wonBooking = f.unwrap(first.issueOffer(f.issue, now)).booking;
      expect(wonBooking.state.offer?.driverId).toBe(f.driverId);
      expect(findDriver(second, { entries: [otherDriver, wonReservation], now })).toEqual({
        type: 'offer_to',
        driverId: f.otherDriverId,
      });
    }),
    { numRuns: PROPERTY_RUNS },
  );
});

function makeDriver(standId: typeof f.standId, queuedAt: bigint) {
  return { driverId: f.driverId, standId, availability: 'online', queuedAt } as const;
}

function issueFallbackOffer(requested: Booking, now: PlannerInput['now']) {
  const dispatchDeadline = requested.state.dispatchDeadline;
  assert(dispatchDeadline);
  return f.unwrap(
    RideOffer.issue({
      bookingId: f.bookingId,
      offerId: f.offerId,
      driverId: f.driverId,
      standId: f.otherStandId,
      now,
      dispatchDeadline,
      offerTimeout: f.duration(SHORT_OFFER_TIMEOUT_IN_MILLISECONDS),
    }),
  );
}

function verifyExpiry(offering: Booking, offer: RideOffer, search: SearchState) {
  const now = offer.expiresAt;
  expect(offer.isExpired(now)).toBe(true);
  expect(findDriver(offering, search)).toEqual({ type: 'expire_offer', offerId: f.offerId });
  const expired = f.unwrap(offering.closeOffer(f.expire, now));
  expect(expired.booking.state.status).toBe('requested');
  expect(expired.booking.state.offer).toBeUndefined();
  expect(expired.events.map(({ type }) => type)).toEqual(['RideOfferExpired']);
  return expired.booking;
}

function releaseAfterExpiry(reserved: DriverQueueEntry, now: PlannerInput['now']) {
  const released = f.unwrap(
    releaseDriverQueueEntry({
      entry: reserved,
      outcome: 'expired',
      offerId: f.offerId,
      now,
      standEntries: [reserved],
      declinePenalty: new KeepPositionPolicy(),
    }),
  );
  expect(released.queuedAt).toBe(BigInt(now.epochMilliseconds) * MICROSECONDS_PER_MILLISECOND);
  return released;
}

function makeFallbackBooking() {
  return f.unwrap(
    Booking.request(
      {
        ...f.request,
        alternateStandIds: [f.otherStandId],
        dispatchDuration: f.duration(DISPATCH_DURATION_IN_MILLISECONDS),
      },
      f.at(0),
    ),
  ).booking;
}

it('I3/I5/I8/I9 expire a due fallback offer before restarting the search with its attempt recorded', () => {
  const requested = makeFallbackBooking();
  fc.assert(
    fc.property(contest, ({ queuedAt, gapInMicroseconds, issuedAtInMilliseconds }) => {
      const driver = makeDriver(f.otherStandId, queuedAt);
      const now = f.at(issuedAtInMilliseconds);
      expect(findDriver(requested, { entries: [driver], now })).toEqual({
        type: 'escalate_to_stand',
        standId: f.otherStandId,
        driverId: f.driverId,
      });
      const offer = issueFallbackOffer(requested, now);
      const offering = f.unwrap(requested.issueOffer({ offer, ...authority }, now)).booking;
      const reserved = f.unwrap(reserveDriverQueueEntry(driver, f.offerId));
      const due = offer.expiresAt;
      const offerHistory = [{ bookingId: f.bookingId, driverId: f.driverId }];
      const expired = verifyExpiry(offering, offer, {
        entries: [reserved],
        now: due,
        offerHistory,
      });
      const released = releaseAfterExpiry(reserved, due);
      const entries = [
        { ...released, standId: f.standId },
        {
          ...released,
          driverId: f.otherDriverId,
          standId: f.standId,
          queuedAt: released.queuedAt + gapInMicroseconds,
        },
      ];
      expect(findDriver(expired, { entries, now: due, offerHistory })).toEqual({
        type: 'offer_to',
        driverId: f.otherDriverId,
      });
    }),
    { numRuns: PROPERTY_RUNS },
  );
});
