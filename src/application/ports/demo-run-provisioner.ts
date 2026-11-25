import type { DemoRunId, RiderId, TownId } from '@domain/shared/ids.value-object';
import type { OnlineDriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import type { ApplicationResult } from './application-result';
import type { DemoDriver, ScopedQueueEntry, SimulationSteps } from './driver-queue-repository';
import type { Stand } from './stand-repository';

export interface DemoRunProvisioning {
  readonly run: {
    readonly demoRunId: DemoRunId;
    readonly riderId: RiderId;
    readonly townId: TownId;
    readonly expiresAtEpochMilliseconds: number;
  };
  readonly stand: Stand & { readonly demoRunId: DemoRunId };
  readonly drivers: readonly ScriptedDemoDriver[];
}

export interface ScriptedDemoDriver extends ScopedQueueEntry {
  readonly demoRunId: DemoRunId;
  readonly demoDriver: DemoDriver;
  readonly simulationSteps: SimulationSteps;
  readonly entry: OnlineDriverQueueEntry;
}

export interface DemoRunProvisioner {
  provision(input: DemoRunProvisioning): Promise<ApplicationResult<void>>;
}
