import fc from 'fast-check';
import { expect, it } from 'vitest';
import type { Booking } from '@domain/dispatch/booking';
import type { BookingEvent } from '@domain/dispatch/booking-events';
import * as f from '../unit/domain/dispatch/booking.fixtures';
import { PROPERTY_RUNS } from './property-runs.fixtures';

const OFFER_EXPIRY_IN_MILLISECONDS = 15;
const MAX_CLOCK_ADVANCE_IN_MILLISECONDS = 4;

const lifecycleCommands = fc.array(
  fc.record({
    action: fc.constantFrom(
      'accept',
      'decline',
      'expire',
      'offline',
      'arrive',
      'pickup',
      'complete',
      'cancel',
    ),
    advanceByMilliseconds: fc.integer({ min: 0, max: MAX_CLOCK_ADVANCE_IN_MILLISECONDS }),
  }),
  { minLength: 1, maxLength: 30 },
);

const transition = {
  accept: (booking, now) => booking.acceptOffer(f.accept, now),
  decline: (booking, now) => booking.closeOffer(f.decline, now),
  expire: (booking, now) => booking.closeOffer(f.expire, now),
  offline: (booking, now) => booking.closeOffer(f.withdraw, now),
  arrive: (booking, now) => booking.reportArrival(f.driverId, now),
  pickup: (booking, now) => booking.confirmPickup(f.driverId, now),
  complete: (booking, now) => booking.completeTrip(f.driverId, now),
  cancel: (booking, now) => booking.cancelByRider(f.riderId, now),
} satisfies Record<
  string,
  (booking: Booking, now: ReturnType<typeof f.at>) => ReturnType<Booking['acceptOffer']>
>;

it('I3/I4/I12 keep one pending offer, at most one Trip, and one event per transition', () => {
  fc.assert(
    fc.property(lifecycleCommands, (commands) => {
      const { booking: offering } = f.unwrap(
        f
          .makeRequested()
          .issueOffer(
            { ...f.issue, offer: { ...f.offer, expiresAt: f.at(OFFER_EXPIRY_IN_MILLISECONDS) } },
            f.at(1),
          ),
      );
      let booking = offering;
      let nowInMilliseconds = 1;
      const eventTypes = new Set<BookingEvent['type']>(['RideOfferCreated']);
      for (const { action, advanceByMilliseconds } of commands) {
        nowInMilliseconds += advanceByMilliseconds;
        const now = f.at(nowInMilliseconds);
        const run = transition[action];
        const applied = run(booking, now);
        if (applied.ok) {
          booking = applied.value.booking;
          expect(run(booking, now).ok).toBe(false);
          for (const event of applied.value.events) {
            expect(eventTypes.has(event.type)).toBe(false);
            eventTypes.add(event.type);
          }
        }
        expect(booking.state.offer !== undefined).toBe(booking.state.status === 'offering');
        expect(booking.state.offer === undefined || booking.state.trip === undefined).toBe(true);
      }
    }),
    { numRuns: PROPERTY_RUNS },
  );
});
