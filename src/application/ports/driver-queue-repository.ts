import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import type { DriverId, StandId } from '@domain/shared/ids.value-object';
import type { BookingScope } from '@domain/town/town';
import type { Translations } from '../contracts/town-overview-view';

export type SimulationSteps = Readonly<
  Partial<Record<'accept' | 'arrive' | 'start' | 'complete' | 'decline', number>>
>;

export interface DemoDriver {
  readonly name: string;
  readonly names: Translations;
  readonly vehicleNumber: string;
}

export interface ScopedQueueEntry extends BookingScope {
  readonly needsRejoin?: true;
  readonly demoDriver?: DemoDriver;
  readonly simulationSteps?: SimulationSteps;
  readonly entry: DriverQueueEntry;
}
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface DriverQueueRepository {
  get(id: DriverId): Promise<Versioned<ScopedQueueEntry> | undefined>;
  listForStands(
    scope: BookingScope,
    standIds: readonly StandId[],
  ): Promise<readonly Versioned<ScopedQueueEntry>[]>;
  save(value: ScopedQueueEntry, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
