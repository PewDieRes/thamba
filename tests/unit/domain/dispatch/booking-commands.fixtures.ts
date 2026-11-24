import type { Booking } from '@domain/dispatch/booking';
import type { BookingCommand } from '@domain/dispatch/booking-status';
import type { Instant } from '@domain/shared/instant.value-object';
import * as f from './booking.fixtures';

export const runBookingCommand = {
  activate: (booking, now) => booking.activate(f.canBook, now),
  closeSchedule: (booking, now) => booking.closeSchedule(f.cannotBook, now),
  issueOffer: (booking, now) =>
    booking.issueOffer(
      {
        ...f.canBook,
        offer: { ...f.offer, expiresAt: f.at(now.epochMilliseconds + f.MINUTE_IN_MILLISECONDS) },
      },
      now,
    ),
  closeOffer: (booking, now) => booking.closeOffer(f.decline, now),
  acceptOffer: (booking, now) => booking.acceptOffer(f.accept, now),
  reportArrival: (booking, now) => booking.reportArrival(f.driverSession, now),
  confirmPickup: (booking, now) => booking.confirmPickup(f.driverSession, now),
  completeTrip: (booking, now) => booking.completeTrip(f.driverSession, now),
  endSearch: (booking, now) => booking.endSearch(f.search, now),
  endOffering: (booking, now) => booking.endOffering(f.cannotBook, now),
  cancelByRider: (booking, now) => booking.cancelByRider(f.riderId, now),
  cancelByDriver: (booking, now) => booking.cancelByDriver(f.driverSession, now),
} satisfies Record<
  BookingCommand,
  (booking: Booking, now: Instant) => ReturnType<Booking['activate']>
>;

export const bookingCommands = Object.keys(runBookingCommand) as BookingCommand[];
