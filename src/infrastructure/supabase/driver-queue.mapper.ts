import type { ScopedQueueEntry, SimulationSteps } from '@application/ports/driver-queue-repository';
import type { OnlineDriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { readTranslations } from './catalogue.mapper';
import type { Json, Tables } from './database.types';
import { z } from 'zod';
import { mapOptional, readScope, versioned, writeRunScope } from './row.mapper';

export type DriverQueueRow = Pick<
  Tables<'driver_slots'>,
  'driver_id' | 'stand_id' | 'town_id' | 'run_scope_id' | 'pending_offer_id' | 'version'
> & {
  queued_at_epoch_microseconds: string | null;
  simulation_steps?: Json;
  demo_driver_name?: string | null;
  demo_driver_names?: Json;
  demo_vehicle_number?: string | null;
};

export function fromDriverQueueRow(row: DriverQueueRow) {
  const identity = {
    driverId: row.driver_id as OnlineDriverQueueEntry['driverId'],
    standId: row.stand_id as OnlineDriverQueueEntry['standId'],
  };
  return versioned<ScopedQueueEntry>(row, {
    ...readScope(row.town_id, row.run_scope_id),
    ...mapOptional('simulationSteps', readSimulationSteps(row.simulation_steps)),
    ...mapOptional('demoDriver', readDemoDriver(row)),
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

const stepSchema = z.array(
  z.object({
    action: z.enum(['accept', 'arrive', 'start', 'complete', 'decline']),
    delay_seconds: z.int().nonnegative(),
  }),
);

function readSimulationSteps(value: Json | undefined): SimulationSteps | undefined {
  const parsed = stepSchema.safeParse(value);
  if (!parsed.success || parsed.data.length === 0) return undefined;
  return Object.fromEntries(
    parsed.data.map(({ action, delay_seconds }) => [action, delay_seconds]),
  );
}

function readDemoDriver(row: DriverQueueRow) {
  if (row.demo_driver_name == null || row.demo_vehicle_number == null) return undefined;
  return {
    name: row.demo_driver_name,
    names: readTranslations(row.demo_driver_names),
    vehicleNumber: row.demo_vehicle_number,
  };
}
