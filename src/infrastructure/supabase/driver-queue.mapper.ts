import type { ScopedQueueEntry } from '@application/ports/driver-queue-repository';
import type { OnlineDriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import type { Tables } from './database.types';
import { mapOptional, readScope, versioned, writeRunScope } from './row.mapper';

export type DriverQueueRow = Pick<
  Tables<'driver_slots'>,
  'driver_id' | 'stand_id' | 'town_id' | 'run_scope_id' | 'pending_offer_id' | 'version'
> & { queued_at_epoch_microseconds: string | null };

export function fromDriverQueueRow(row: DriverQueueRow) {
  const identity = {
    driverId: row.driver_id as OnlineDriverQueueEntry['driverId'],
    standId: row.stand_id as OnlineDriverQueueEntry['standId'],
  };
  return versioned<ScopedQueueEntry>(row, {
    ...readScope(row.town_id, row.run_scope_id),
    entry:
      row.queued_at_epoch_microseconds === null
        ? { ...identity, availability: 'offline' }
        : {
            ...identity,
            availability: 'online',
            queuedAt: BigInt(row.queued_at_epoch_microseconds),
            ...mapOptional(
              'reservation',
              row.pending_offer_id as OnlineDriverQueueEntry['reservation'] | null,
            ),
          },
  });
}

export function toDriverQueueRow(value: ScopedQueueEntry): Omit<DriverQueueRow, 'version'> {
  const { entry } = value;
  return {
    ...writeRunScope(value),
    driver_id: entry.driverId,
    stand_id: entry.standId,
    queued_at_epoch_microseconds:
      entry.availability === 'online' ? entry.queuedAt.toString() : null,
    pending_offer_id: entry.availability === 'online' ? (entry.reservation ?? null) : null,
  };
}
