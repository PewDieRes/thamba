import type { Booking } from '@domain/dispatch/booking';
import type { BookingId, DriverId, SessionSubject } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { err } from '@domain/shared/result';
import type { IdGenerator } from '../ports/id-generator';
import type { Transaction } from '../ports/unit-of-work';
import { mapBookingProgress } from './booking.mapper';
import { getDriverSession } from './driver-session';
import { commit } from './execute-command';
import { saveBookingDecision } from './save-booking-decision';

type TripAction = 'reportArrival' | 'confirmPickup' | 'completeTrip' | 'cancelByDriver';

export async function progressTrip(
  tx: Transaction,
  { bookingId, subject }: { bookingId: BookingId; subject: SessionSubject },
  { ids, now, action }: { ids: IdGenerator; now: Instant; action: TripAction },
) {
  const session = await getDriverSession(tx.devices, subject);
  if (!session.ok) return session;
  const current = await tx.bookings.get(bookingId);
  if (current?.value.state.trip?.driverId !== session.value.driverId) {
    return err({ code: 'not_found' as const });
  }
  const booking: Booking = current.value;
  const decision = booking[action](session.value.driver, now);
  if (!decision.ok) return decision;
  const saved = await saveBookingDecision(tx, decision.value, {
    ids,
    expectedVersion: current.version,
  });
  if (!saved.ok) return saved;
  if (action === 'completeTrip') {
    const marked = await markQueueRejoin(tx, session.value.driverId);
    if (!marked.ok) return marked;
  }
  return commit(mapBookingProgress(decision.value.booking));
}

async function markQueueRejoin(tx: Transaction, driverId: DriverId) {
  const queue = await tx.drivers.get(driverId);
  return queue
    ? tx.drivers.save({ ...queue.value, needsRejoin: true }, queue.version)
    : err({ code: 'inconsistent_state' as const });
}
