import type { ComplaintId, DemoRunId, RiderId, TownId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { ApplicationResult } from './application-result';

export type ComplaintTopic = 'fare' | 'wait' | 'trip';

export interface DemoComplaint {
  readonly townId: TownId;
  readonly demoRunId: DemoRunId;
  readonly riderId: RiderId;
  readonly complaintId: ComplaintId;
  readonly topic: ComplaintTopic;
  readonly now: Instant;
}

export interface DemoComplaintWriter {
  save(complaint: DemoComplaint): Promise<ApplicationResult<void>>;
}
