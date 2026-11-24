import fc from 'fast-check';
import { assert, expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import { planNextDispatchStep } from '@domain/dispatch/dispatch-planner';
import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { FairRotationPolicy } from '@domain/dispatch/fair-rotation.policy';
import { createBookingId, createDriverId, createStandId } from '@domain/shared/ids.value-object';
import * as f from '../unit/domain/dispatch/booking.fixtures';
import { PROPERTY_RUNS } from './property-runs.fixtures';

const EXTRA_STAND_COUNT = 3;
const MAX_DRIVERS = 12;
const MAX_QUEUE_TIME_IN_MICROSECONDS = 5n;

function fixtureUuid(index: number): string {
  return `f9000000-abcd-abcd-abcd-${index.toString().padStart(12, '0')}`;
}

const OTHER_BOOKING_ID = f.unwrap(createBookingId(fixtureUuid(0)));

const extraStandIds = Array.from({ length: EXTRA_STAND_COUNT }, (_, index) =>
  f.unwrap(createStandId(fixtureUuid(index))),
);
const standIds = [f.standId, ...extraStandIds];
const driverIds = Array.from({ length: MAX_DRIVERS }, (_, index) =>
  f.unwrap(createDriverId(fixtureUuid(index))),
);
const policies = { driverRanking: new FairRotationPolicy() };

const driverDetails = fc.record({
  standId: fc.constantFrom(...standIds),
  queuedAt: fc.bigInt({ min: 0n, max: MAX_QUEUE_TIME_IN_MICROSECONDS }),
  status: fc.constantFrom('available', 'reserved', 'on_trip', 'offline'),
  history: fc.constantFrom('untried', 'this_booking', 'other_booking'),
});

const standDetails = fc.record({
  servesPickupArea: fc.boolean(),
  hasCorrectTown: fc.boolean(),
  hasCorrectRun: fc.boolean(),
});

const fallbackCase = fc.record({
  candidates: fc.array(fc.constantFrom(...standIds), { maxLength: EXTRA_STAND_COUNT * 2 }),
  cap: fc.option(fc.integer({ min: 1, max: standIds.length }), { nil: undefined }),
  standDetails: fc.array(standDetails, { minLength: standIds.length, maxLength: standIds.length }),
  drivers: fc.uniqueArray(
    fc.record({ driverId: fc.constantFrom(...driverIds), details: driverDetails }),
    { selector: ({ driverId }) => driverId, maxLength: MAX_DRIVERS },
  ),
});

type FallbackCase = typeof fallbackCase extends fc.Arbitrary<infer T> ? T : never;
type DriverFixture = FallbackCase['drivers'][number];

function toQueueEntry({ driverId, details }: DriverFixture): DriverQueueEntry {
  const { standId, status, queuedAt } = details;
  if (status === 'offline') return { driverId, standId, availability: 'offline' };
  return {
    driverId,
    standId,
    availability: 'online',
    queuedAt,
    ...(status === 'reserved' ? { reservation: f.otherOfferId } : {}),
  };
}

function makeSnapshot(input: FallbackCase) {
  const stands = standIds.map((standId, index) => {
    const details = input.standDetails[index];
    if (details === undefined) throw new Error('Missing generated Stand eligibility');
    return {
      standId,
      servesPickupArea: details.servesPickupArea,
      townId: details.hasCorrectTown ? f.townId : f.otherTownId,
      ...(details.hasCorrectRun ? { demoRunId: f.demoRunId } : {}),
    };
  });
  const activeTripDriverIds = new Set(
    input.drivers
      .filter(({ details }) => details.status === 'on_trip')
      .map(({ driverId }) => driverId),
  );
  return { stands, activeTripDriverIds, entries: input.drivers.map(toQueueEntry) };
}

function getOfferHistory(input: FallbackCase) {
  return input.drivers.flatMap(({ driverId, details }) =>
    details.history === 'untried'
      ? []
      : [
          {
            driverId,
            bookingId: details.history === 'this_booking' ? f.bookingId : OTHER_BOOKING_ID,
          },
        ],
  );
}

function compareDrivers(a: DriverFixture, b: DriverFixture) {
  if (a.details.queuedAt === b.details.queuedAt) return a.driverId < b.driverId ? -1 : 1;
  return a.details.queuedAt < b.details.queuedAt ? -1 : 1;
}

function referenceFallback(input: FallbackCase) {
  const captured = [f.standId, ...new Set(input.candidates.filter((id) => id !== f.standId))];
  const eligibleDrivers = input.drivers
    .filter(({ details }) => details.status === 'available' && details.history !== 'this_booking')
    .sort(compareDrivers);
  for (const standId of captured.slice(0, input.cap)) {
    const stand = input.standDetails[standIds.indexOf(standId)];
    if (!stand?.hasCorrectTown || !stand.hasCorrectRun || !stand.servesPickupArea) continue;
    const selected = eligibleDrivers.find(({ details }) => details.standId === standId);
    if (selected === undefined) continue;
    return standId === f.standId
      ? { type: 'offer_to', driverId: selected.driverId }
      : { type: 'escalate_to_stand', standId, driverId: selected.driverId };
  }
  return { type: 'give_up', reason: 'stands_exhausted' };
}

it('I8/I11 match the first eligible Driver and Stand in the captured, scoped search list', () => {
  const scope = { townId: f.townId, demoRunId: f.demoRunId };
  const demoRequest = { ...f.request, scope, quote: { ...f.quote, scope } };
  fc.assert(
    fc.property(fallbackCase, (sample) => {
      const alternateStandIds = [...sample.candidates];
      const booking = f.unwrap(
        Booking.request(
          {
            ...demoRequest,
            alternateStandIds,
            ...(sample.cap === undefined ? {} : { maxSearchStands: sample.cap }),
          },
          f.at(0),
        ),
      ).booking;
      alternateStandIds.reverse();
      alternateStandIds.push(...standIds);

      const decision = planNextDispatchStep({
        booking,
        now: f.at(1),
        authority: f.canBook,
        queueSnapshot: makeSnapshot(sample),
        offerHistory: getOfferHistory(sample),
        policies,
      });
      expect(decision).toEqual(referenceFallback(sample));
    }),
    { numRuns: PROPERTY_RUNS },
  );
});

const pendingCases = fc.record({
  isOffering: fc.boolean(),
  canBook: fc.boolean(),
  deadline: fc.constantFrom('offer', 'dispatch'),
  offsetInMilliseconds: fc.constantFrom(-1, 0, 1),
});

const emptyQueue = { entries: [], stands: [], activeTripDriverIds: new Set<typeof f.driverId>() };

it('I1/I3/I5/I11 give precedence to the dispatch deadline, then authority, then offer expiry', () => {
  fc.assert(
    fc.property(pendingCases, ({ isOffering, canBook, deadline, offsetInMilliseconds }) => {
      const boundary =
        deadline === 'offer'
          ? f.offer.expiresAt.epochMilliseconds
          : f.DEFAULT_DISPATCH_IN_MILLISECONDS;
      const now = f.at(boundary + offsetInMilliseconds);
      const booking = isOffering ? f.makeOffering() : f.makeRequested();
      const decision = planNextDispatchStep({
        booking,
        now,
        authority: { canBook },
        queueSnapshot: emptyQueue,
        offerHistory: [],
        policies,
      });
      if (now.epochMilliseconds >= f.DEFAULT_DISPATCH_IN_MILLISECONDS) {
        expect(decision).toEqual({ type: 'give_up', reason: 'dispatch_deadline' });
      } else if (!canBook) {
        expect(decision).toEqual({ type: 'give_up', reason: 'booking_unavailable' });
      } else if (!isOffering) {
        expect(decision).toEqual({ type: 'give_up', reason: 'stands_exhausted' });
      } else if (now.isBefore(f.offer.expiresAt)) {
        assert(decision.type === 'wait_for_response');
        expect(decision.until.epochMilliseconds).toBe(f.offer.expiresAt.epochMilliseconds);
      } else {
        expect(decision).toEqual({ type: 'expire_offer', offerId: f.offerId });
      }
      expect(booking.state.offer !== undefined).toBe(isOffering);
    }),
    { numRuns: PROPERTY_RUNS },
  );
});
