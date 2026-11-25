import type { Booking } from '@domain/dispatch/booking';
import type { BookingEffects } from '@domain/dispatch/booking-decision';
import type { BookingActor } from '@domain/dispatch/booking-events';
import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import type { BookingId, DriverId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { WriteResult } from '../ports/application-result';
import type { ScopedQueueEntry } from '../ports/driver-queue-repository';
import type { DriverQueueChanged } from '../ports/event-log';
import type { IdGenerator } from '../ports/id-generator';
import type { Transaction } from '../ports/unit-of-work';
import type { ExpectedVersion, Versioned } from '../ports/versioned';
import { getScope } from './booking-authority';
import { appendEvents } from './record-events';

export type BookingChange = { readonly booking: Booking } & BookingEffects;

export async function saveBookingDecision(
  tx: Transaction,
  decision: BookingChange,
  options: { readonly expectedVersion: ExpectedVersion; readonly ids: IdGenerator },
): Promise<WriteResult> {
  const { booking, trip, events } = decision;
  const saved = await tx.bookings.save(booking, options.expectedVersion);
  if (!saved.ok) return saved;
  if (trip) {
    const current = await tx.trips.get(trip.bookingId);
    const savedTrip = await tx.trips.save(trip, current?.version ?? null);
    if (!savedTrip.ok) return savedTrip;
  }
  return appendEvents(tx.events, options.ids, events);
}

interface QueueChange {
  readonly previous: Versioned<ScopedQueueEntry>;
  readonly entry: DriverQueueEntry;
  readonly actor: BookingActor;
  readonly now: Instant;
  readonly reason: DriverQueueChanged['reason'];
  readonly availabilityReason?: 'skip' | 'walk_up' | undefined;
  readonly bookingId?: BookingId;
  readonly eligibleDriverIds?: readonly DriverId[];
}

export async function saveQueueChange(
  tx: Transaction,
  ids: IdGenerator,
  {
    previous,
    entry,
    actor,
    now,
    reason,
    availabilityReason,
    bookingId,
    eligibleDriverIds,
  }: QueueChange,
): Promise<WriteResult> {
  const next = { ...previous.value, entry };
  if (entry.availability === 'online') delete next.needsRejoin;
  const saved = await tx.drivers.save(next, previous.version);
  if (!saved.ok) return saved;
  return appendEvents(tx.events, ids, [
    {
      ...getScope(previous.value),
      type: 'DriverQueueChanged',
      actor,
      occurredAt: now,
      driverId: entry.driverId,
      standId: entry.standId,
      reason,
      before: previous.value.entry,
      ...(availabilityReason === undefined ? {} : { availabilityReason }),
      after: entry,
      ...(bookingId === undefined ? {} : { bookingId }),
      ...(eligibleDriverIds === undefined ? {} : { eligibleDriverIds }),
    },
  ]);
}
