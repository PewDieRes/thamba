import { expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS } from '@domain/dispatch/booking-status';
import type { BookingStatus } from '@domain/dispatch/booking-status';
import { err } from '@domain/shared/result';
import { bookingCommands, runBookingCommand } from './booking-commands.fixtures';
import { at, makeBooking } from './booking.fixtures';

const states = Object.keys(ALLOWED_TRANSITIONS) as BookingStatus[];
const illegalTransitions = states.flatMap((state) =>
  bookingCommands
    .filter((command) => !Object.hasOwn(ALLOWED_TRANSITIONS[state], command))
    .map((command) => ({ state, command })),
);

it.each(illegalTransitions)('rejects $command from $state', ({ state, command }) => {
  const booking = makeBooking[state]();
  expect(runBookingCommand[command](booking, at(10))).toEqual(err({ code: 'illegal_transition' }));
  expect(booking.state.status).toBe(state);
});
