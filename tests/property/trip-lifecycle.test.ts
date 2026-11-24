import fc from 'fast-check';
import { assert, expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import { planNextDispatchStep } from '@domain/dispatch/dispatch-planner';
import { joinDriverQueue, reserveDriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { FairRotationPolicy } from '@domain/dispatch/fair-rotation.policy';
import { createBookingId, createRideOfferId, createTripId } from '@domain/shared/ids.value-object';
import * as f from '../unit/domain/dispatch/booking.fixtures';
import { PROPERTY_RUNS } from './property-runs.fixtures';

const GENERATED_REPLAY_TIMEOUT_MILLISECONDS = 60_000;
const MICROSECONDS_PER_MILLISECOND = 1_000n;
const ROUND_SPACING_MILLISECONDS = 10;
const MAX_ROUNDS = 8;
const MAX_QUEUE_GAP_MICROSECONDS = 500n;
const stands = [{ standId: f.standId, townId: f.townId, servesPickupArea: true }];
const policies = { driverRanking: new FairRotationPolicy() };

const outcomes = ['completed', 'cancelled_by_rider', 'cancelled_by_driver'] as const;
interface Round {
  readonly outcome: (typeof outcomes)[number];
  readonly progress: number;
  readonly tailAheadInMicroseconds: bigint;
}

const round = fc.record({
  outcome: fc.constantFrom(...outcomes),
  progress: fc.integer({ min: 0, max: 2 }),
  tailAheadInMicroseconds: fc.bigInt({
    min: -MAX_QUEUE_GAP_MICROSECONDS,
    max: MAX_QUEUE_GAP_MICROSECONDS,
  }),
});

function makeRequested(index: number, now: ReturnType<typeof f.at>) {
  const uuid = `aaaaaaaa-aaaa-aaaa-aaaa-${index.toString().padStart(12, '0')}`;
  return {
    booking: f.unwrap(
      Booking.request({ ...f.request, bookingId: f.unwrap(createBookingId(uuid)) }, now),
    ).booking,
    offerId: f.unwrap(createRideOfferId(uuid)),
    tripId: f.unwrap(createTripId(uuid)),
  };
}

function checkSlots(bookings: readonly Booking[], entry: DriverQueueEntry) {
  const offers = bookings.flatMap(({ state }) => (state.offer ? [state.offer] : []));
  const trips = bookings.flatMap(({ state }) => (state.trip ? [state.trip] : []));
  expect(offers.length + trips.length).toBeLessThanOrEqual(1);
  if (trips.length > 0) expect(entry).toEqual(offline);
  const [offer] = offers;
  if (offer) expect(entry).toMatchObject({ availability: 'online', reservation: offer.offerId });
}

const offline = { availability: 'offline', driverId: f.driverId, standId: f.standId } as const;

function verifyCompetingBooking(
  competing: Booking,
  current: Booking,
  entry: DriverQueueEntry,
  now: ReturnType<typeof f.at>,
) {
  checkSlots([competing, current], entry);
  const activeTripDriverIds = new Set(current.state.trip ? [current.state.trip.driverId] : []);
  expect(
    planNextDispatchStep({
      booking: competing,
      queueSnapshot: { entries: [entry], stands, activeTripDriverIds },
      offerHistory: [],
      authority: f.canBook,
      policies,
      now,
    }),
  ).toEqual({ type: 'give_up', reason: 'stands_exhausted' });
  expect(reserveDriverQueueEntry(entry, f.otherOfferId).ok).toBe(false);
}

function endTrip(accepted: Booking, spec: Round, startedAtMilliseconds: number) {
  let booking = accepted;
  if (spec.progress >= 1 || spec.outcome === 'completed') {
    booking = f.unwrap(
      booking.reportArrival(f.driverSession, f.at(startedAtMilliseconds + 1)),
    ).booking;
  }
  if (spec.progress >= 2 || spec.outcome === 'completed') {
    booking = f.unwrap(
      booking.confirmPickup(f.driverSession, f.at(startedAtMilliseconds + 2)),
    ).booking;
  }
  const now = f.at(startedAtMilliseconds + 3);
  if (spec.outcome === 'completed') return f.unwrap(booking.completeTrip(f.driverSession, now));
  if (spec.outcome === 'cancelled_by_rider') return f.unwrap(booking.cancelByRider(f.riderId, now));
  return f.unwrap(booking.cancelByDriver(f.driverSession, now));
}

function rejoin(entry: DriverQueueEntry, now: ReturnType<typeof f.at>, spec: Round) {
  const nowInMicroseconds = BigInt(now.epochMilliseconds) * MICROSECONDS_PER_MILLISECOND;
  const tail = {
    driverId: f.otherDriverId,
    standId: f.standId,
    availability: 'online',
    queuedAt: nowInMicroseconds + spec.tailAheadInMicroseconds,
    reservation: f.otherOfferId,
  } as const;
  const input = { entry, now, standEntries: [tail], hasActiveTrip: false };
  const joined = f.unwrap(joinDriverQueue(input));
  expect(joined.queuedAt).toBe(
    spec.tailAheadInMicroseconds >= 0n ? tail.queuedAt + 1n : nowInMicroseconds,
  );
  expect(joined.reservation).toBeUndefined();
  expect(f.unwrap(joinDriverQueue({ ...input, entry: joined, standEntries: [tail, joined] }))).toBe(
    joined,
  );
  return joined;
}

function runRound(entry: DriverQueueEntry, spec: Round, index: number) {
  const startedAtMilliseconds = index * ROUND_SPACING_MILLISECONDS;
  const now = f.at(startedAtMilliseconds);
  const { booking, offerId, tripId } = makeRequested(index, now);
  const competing = makeRequested(MAX_ROUNDS + index, now).booking;
  const issue = { ...f.issue, offer: { ...f.offer, offerId } };
  const pendingEntry = f.unwrap(reserveDriverQueueEntry(entry, offerId));
  const offering = f.unwrap(booking.issueOffer(issue, now)).booking;
  assert(entry.availability === 'online');
  expect(pendingEntry.queuedAt).toBe(entry.queuedAt);
  verifyCompetingBooking(competing, offering, pendingEntry, now);

  const input = { ...f.canBook, driver: f.driverSession, entry: pendingEntry, offerId, tripId };
  const accepted = f.unwrap(offering.acceptOffer(input, now));
  assert(accepted.queueEntry);
  expect(accepted.booking.acceptOffer({ ...input, tripId: f.tripId }, now).ok).toBe(false);
  verifyCompetingBooking(competing, accepted.booking, accepted.queueEntry, now);
  expect(
    joinDriverQueue({
      entry: accepted.queueEntry,
      now,
      standEntries: [],
      hasActiveTrip: accepted.booking.state.trip !== undefined,
    }).ok,
  ).toBe(false);

  const ended = endTrip(accepted.booking, spec, startedAtMilliseconds);
  expect(ended.trip).toMatchObject({ tripId, status: spec.outcome });
  expect(ended.booking.state.trip).toBeUndefined();
  expect(accepted.queueEntry).toEqual(offline);
  checkSlots([ended.booking, competing], accepted.queueEntry);
  expect(ended.booking.issueOffer(issue, now).ok).toBe(false);
  expect(ended.booking.acceptOffer(input, now).ok).toBe(false);
  return rejoin(accepted.queueEntry, f.at(startedAtMilliseconds + 4), spec);
}

it(
  'I4/I9 keep one Driver slot and require explicit tail rejoin across offer and Trip sequences',
  () => {
    fc.assert(
      fc.property(fc.array(round, { minLength: 1, maxLength: MAX_ROUNDS }), (rounds) => {
        const initial = f.unwrap(
          joinDriverQueue({ entry: offline, now: f.at(0), standEntries: [], hasActiveTrip: false }),
        );
        rounds.reduce<DriverQueueEntry>(runRound, initial);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  },
  GENERATED_REPLAY_TIMEOUT_MILLISECONDS,
);
