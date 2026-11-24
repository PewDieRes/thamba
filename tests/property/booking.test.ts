import fc from 'fast-check';
import { expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import type { BookingCommand } from '@domain/dispatch/booking-status';
import {
  bookingCommands,
  runBookingCommand,
} from '../unit/domain/dispatch/booking-commands.fixtures';
import * as f from '../unit/domain/dispatch/booking.fixtures';

interface Step {
  readonly command: BookingCommand;
  readonly advanceByMilliseconds: number;
}

const steps = fc.array(
  fc.record({
    command: fc.constantFrom(...bookingCommands),
    advanceByMilliseconds: fc.integer({ min: 0, max: 20_000 }),
  }),
  { minLength: 1, maxLength: 30 },
);

function* replay(booking: Booking, timeInMilliseconds: number, commands: readonly Step[]) {
  for (const { command, advanceByMilliseconds } of commands) {
    timeInMilliseconds += advanceByMilliseconds;
    const now = f.at(timeInMilliseconds);
    const result = runBookingCommand[command](booking, now);
    if (result.ok) booking = result.value.booking;
    yield { booking, now, events: result.ok ? result.value.events : [] };
  }
}

function confirmFare(isScheduled: boolean, paise: number) {
  const route = { ...f.route };
  const fare = {
    route,
    amount: f.money(paise),
    fareChartVersion: f.quote.fare.fareChartVersion,
  };
  const expected = { ...fare, route: { ...route } };
  const request = { ...f.request, quote: { ...f.quote, fare } };
  const confirmed = isScheduled
    ? f.unwrap(Booking.schedule({ ...f.schedule, ...request }, f.at(0))).booking
    : f.unwrap(Booking.request(request, f.at(0))).booking;

  fare.amount = f.money(paise + 1);
  fare.fareChartVersion += 1;
  route.destinationLandmarkId = route.pickupLandmarkId;
  return { confirmed, expected };
}

it('I6 preserves the confirmed fare, ordered Route and Fare chart version', () => {
  const confirmation = fc.record({
    isScheduled: fc.boolean(),
    paise: fc.integer({ min: 0, max: 100_000 }),
    tickMilliseconds: fc.integer({ min: 1, max: 5_000 }),
  });
  fc.assert(
    fc.property(confirmation, steps, ({ isScheduled, paise, tickMilliseconds }, commands) => {
      const { confirmed, expected } = confirmFare(isScheduled, paise);
      const startInMilliseconds = isScheduled ? f.dueInMilliseconds : 0;
      const requested = isScheduled
        ? f.unwrap(confirmed.activate(f.canBook, f.at(startInMilliseconds))).booking
        : confirmed;
      const sequence = [
        { command: 'issueOffer', advanceByMilliseconds: tickMilliseconds },
        { command: 'acceptOffer', advanceByMilliseconds: tickMilliseconds },
        ...commands,
      ] as const;
      let sawTrip = false;
      for (const { booking, events } of replay(requested, startInMilliseconds, sequence)) {
        expect(booking.state.fare).toMatchObject(expected);
        expect(booking.state.fare.amount.paise).toBe(paise);
        for (const event of events) {
          if (event.type === 'TripCreated') {
            expect(event.fare).toBe(booking.state.fare);
            sawTrip = true;
          }
        }
      }
      expect(sawTrip).toBe(true);
    }),
  );
});

it('I7 preserves every terminal state without an active offer or Trip', () => {
  fc.assert(
    fc.property(steps, (commands) => {
      const terminal = [
        f.makeBooking.completed,
        f.makeBooking.cancelled_by_rider,
        f.makeBooking.cancelled_by_driver,
        f.makeBooking.no_driver_found,
      ];
      for (const make of terminal) {
        const initial = make();
        for (const { booking, events } of replay(initial, 5, commands)) {
          expect(booking).toBe(initial);
          expect(events).toEqual([]);
          expect(booking.state.offer).toBeUndefined();
          expect(booking.state.trip).toBeUndefined();
        }
      }
    }),
  );
});

it('I10 activates a schedule at most once, at or after the captured due time', () => {
  const times = fc.record({
    confirmedAt: fc.integer({ min: -100_000, max: 0 }),
    pickupDelay: fc.integer({ min: 1, max: 100_000 }),
    leadTime: fc.integer({ min: 0, max: 100_000 }),
  });
  fc.assert(
    fc.property(times, steps, ({ confirmedAt, pickupDelay, leadTime }, commands) => {
      const pickupAt = confirmedAt + pickupDelay;
      const dueAt = pickupAt - leadTime;
      const input = { ...f.schedule, pickupAt: f.at(pickupAt), leadTime: f.duration(leadTime) };
      const scheduled = f.unwrap(Booking.schedule(input, f.at(confirmedAt))).booking;
      expect(scheduled.state.requestDueAt?.epochMilliseconds).toBe(dueAt);
      let requestedAt: number | undefined;
      const sequence = [
        { command: 'activate', advanceByMilliseconds: 0 },
        ...commands,
        { command: 'activate', advanceByMilliseconds: pickupDelay },
        { command: 'activate', advanceByMilliseconds: 0 },
      ] as const;
      for (const { booking, now, events } of replay(scheduled, confirmedAt, sequence)) {
        for (const event of events) {
          if (event.type !== 'BookingRequested') continue;
          expect(requestedAt).toBeUndefined();
          expect(now.epochMilliseconds).toBeGreaterThanOrEqual(dueAt);
          requestedAt = now.epochMilliseconds;
        }
        expect(booking.state.requestedAt?.epochMilliseconds).toBe(requestedAt);
        if (booking.state.status === 'scheduled') {
          expect(booking.state.offer).toBeUndefined();
          expect(booking.state.trip).toBeUndefined();
          expect(booking.state.requestedAt).toBeUndefined();
        }
      }
    }),
  );
});
