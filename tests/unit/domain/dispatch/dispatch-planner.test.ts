import { expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import { ConfiguredNeighbourOrderPolicy } from '@domain/dispatch/configured-neighbour-order.policy';
import { planNextDispatchStep } from '@domain/dispatch/dispatch-planner';
import type { DispatchPlannerInput } from '@domain/dispatch/dispatch-planner';
import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { FairRotationPolicy } from '@domain/dispatch/fair-rotation.policy';
import { createStandId } from '@domain/shared/ids.value-object';
import * as f from './booking.fixtures';

const lastStandId = f.unwrap(createStandId('00000000-0000-0000-0000-000000000018'));
const neighbours = [f.standId, f.otherStandId, f.otherStandId, lastStandId];
const requested = { ...f.request, alternateStandIds: neighbours };
const stand = { ...f.scope, standId: f.standId, servesPickupArea: true };
const neighbour = { ...stand, standId: f.otherStandId };
const lastStand = { ...stand, standId: lastStandId };
const originalDriver = {
  driverId: f.driverId,
  standId: f.standId,
  availability: 'online',
  queuedAt: 1n,
} satisfies DriverQueueEntry;
const neighbourDriver = { ...originalDriver, driverId: f.otherDriverId, standId: f.otherStandId };
const queueSnapshot = {
  entries: [originalDriver, neighbourDriver],
  stands: [stand, neighbour, lastStand],
  activeTripDriverIds: new Set<typeof f.driverId>(),
};

function plan(overrides: Partial<DispatchPlannerInput> = {}) {
  return planNextDispatchStep({
    booking: f.unwrap(Booking.request(requested, f.at(0))).booking,
    queueSnapshot,
    offerHistory: [],
    now: f.at(0),
    authority: f.canBook,
    policies: { driverRanking: new FairRotationPolicy() },
    ...overrides,
  });
}

const exhausted = { type: 'give_up', reason: 'stands_exhausted' };
const escalate = { type: 'escalate_to_stand', standId: f.otherStandId, driverId: f.otherDriverId };

it('captures the distinct configured order and applies the cap to that list', () => {
  const standFallback = new ConfiguredNeighbourOrderPolicy();
  const settings = { ...requested, standFallback, maxSearchStands: 2 };
  const booking = f.unwrap(Booking.request(settings, f.at(0))).booking;
  expect(booking.state.searchStandIds).toEqual([f.standId, f.otherStandId]);
  expect(Object.isFrozen(booking.state.searchStandIds)).toBe(true);
  expect(f.unwrap(Booking.request(requested, f.at(0))).booking.state.searchStandIds).toEqual([
    f.standId,
    f.otherStandId,
    lastStandId,
  ]);
  expect(f.makeRequested().state.searchStandIds).toEqual([f.standId]);
});

it.each([0, -1, 1.5])('rejects an invalid search cap (%s)', (maxSearchStands) => {
  expect(Booking.request({ ...requested, maxSearchStands }, f.at(0))).toEqual({
    ok: false,
    error: { code: 'invalid_stand_search_cap' },
  });
});

it('keeps the original captured order and cap after configuration changes', () => {
  const alternateStandIds = [f.otherStandId, lastStandId];
  const settings = { ...f.request, alternateStandIds, maxSearchStands: 2 };
  const booking = f.unwrap(Booking.request(settings, f.at(0))).booking;
  alternateStandIds.reverse();
  settings.maxSearchStands = 3;

  const entries = [neighbourDriver, { ...originalDriver, standId: lastStandId }];
  expect(plan({ booking, queueSnapshot: { ...queueSnapshot, entries } })).toEqual(escalate);
  expect(booking.state.searchStandIds).toEqual([f.standId, f.otherStandId]);
  expect(f.unwrap(Booking.request(settings, f.at(0))).booking.state.searchStandIds).toEqual([
    f.standId,
    lastStandId,
    f.otherStandId,
  ]);
});

it('chooses the original Stand before a neighbour, regardless of queue ordering across Stands', () => {
  expect(
    plan({
      queueSnapshot: {
        ...queueSnapshot,
        entries: [originalDriver, { ...neighbourDriver, queuedAt: 0n }],
      },
    }),
  ).toEqual({ type: 'offer_to', driverId: f.driverId });
});

it('moves to the first eligible neighbour when the original Stand no longer serves the pickup area', () => {
  const stands = [{ ...stand, servesPickupArea: false }, neighbour, lastStand];
  expect(plan({ queueSnapshot: { ...queueSnapshot, stands } })).toEqual(escalate);
});

it.each([
  { ...queueSnapshot, entries: [{ ...originalDriver, reservation: f.offerId }, neighbourDriver] },
  {
    ...queueSnapshot,
    entries: [
      { driverId: f.driverId, standId: f.standId, availability: 'offline' as const },
      neighbourDriver,
    ],
  },
  { ...queueSnapshot, activeTripDriverIds: new Set([f.driverId]) },
])('continues past an occupied or offline Driver', (snapshot) => {
  expect(plan({ queueSnapshot: snapshot })).toEqual(escalate);
});

it.each([
  { stands: [stand, { ...neighbour, servesPickupArea: false }] },
  { stands: [stand, { ...neighbour, townId: f.otherTownId }] },
  { stands: [stand, { ...neighbour, demoRunId: f.demoRunId }] },
  { stands: [stand] },
])(
  'skips a Stand whose captured slot fails current eligibility and honors the cap',
  ({ stands }) => {
    const booking = f.unwrap(
      Booking.request({ ...requested, maxSearchStands: 2 }, f.at(0)),
    ).booking;
    const entries = [neighbourDriver, { ...originalDriver, standId: lastStandId }];
    expect(
      plan({
        booking,
        queueSnapshot: { ...queueSnapshot, entries, stands: [...stands, lastStand] },
      }),
    ).toEqual(exhausted);
  },
);

it('restarts at the original Stand, retaining attempts across Stand changes', () => {
  const now = f.at(f.MINUTE_IN_MILLISECONDS);
  const booking = f.unwrap(f.makeOffering().closeOffer(f.expire, now)).booking;
  const attempted = { ...originalDriver, standId: f.otherStandId };
  const offerHistory = [{ bookingId: f.bookingId, driverId: f.driverId }];
  const entries = [attempted, { ...neighbourDriver, standId: f.standId }];
  expect(
    plan({ booking, now, offerHistory, queueSnapshot: { ...queueSnapshot, entries } }),
  ).toEqual({ type: 'offer_to', driverId: f.otherDriverId });
  expect(
    plan({ booking, now, offerHistory, queueSnapshot: { ...queueSnapshot, entries: [attempted] } }),
  ).toEqual(exhausted);
});

it('waits before expiry and expires at equality while dispatch is open', () => {
  const booking = f.makeOffering();
  expect(plan({ booking, now: f.at(f.MINUTE_IN_MILLISECONDS - 1) })).toEqual({
    type: 'wait_for_response',
    until: f.offer.expiresAt,
  });
  expect(plan({ booking, now: f.at(f.MINUTE_IN_MILLISECONDS) })).toEqual({
    type: 'expire_offer',
    offerId: f.offerId,
  });
});

it.each([f.makeRequested, f.makeOffering])(
  'gives deadline priority over authority and offer expiry',
  (makeBooking) => {
    const booking = makeBooking();
    const authority = f.cannotBook;
    expect(plan({ booking, authority, now: f.at(f.DEFAULT_DISPATCH_IN_MILLISECONDS - 1) })).toEqual(
      { type: 'give_up', reason: 'booking_unavailable' },
    );
    expect(plan({ booking, authority, now: f.at(f.DEFAULT_DISPATCH_IN_MILLISECONDS) })).toEqual({
      type: 'give_up',
      reason: 'dispatch_deadline',
    });
  },
);

it('declines to plan dispatch for a Booking outside requested and offering', () => {
  expect(plan({ booking: f.makeAccepted() })).toEqual({
    type: 'give_up',
    reason: 'booking_unavailable',
  });
});
