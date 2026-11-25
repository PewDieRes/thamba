import type { DemoRunId, RiderId, StandId, TownId } from '@domain/shared/ids.value-object';
import type { ApplicationResult } from './application-result';

export interface DemoRunProvisioning {
  readonly demoRunId: DemoRunId;
  readonly riderId: RiderId;
  readonly standId: StandId;
  readonly templateStandId: StandId;
  readonly townId: TownId;
}

export interface DemoRunProvisioner {
  provision(input: DemoRunProvisioning): Promise<ApplicationResult<void>>;
}
