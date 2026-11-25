import type {
  DriverInviteFacts,
  DriverInviteScope,
} from '@domain/identity/driver-invite-eligibility';
import type { SessionSubject } from '@domain/shared/ids.value-object';
import type {
  CoordinatorDashboardView,
  CoordinatorDriver,
  CoordinatorBooking,
  QueueChange,
} from '../contracts/coordinator-dashboard-view';
import type { CoordinatorMembership } from './actor-context';
import type { ApplicationResult } from './application-result';

export interface DashboardScope {
  readonly subject: SessionSubject;
  readonly membership: CoordinatorMembership;
  readonly dayStart: number;
  readonly dayEnd: number;
}

export interface DashboardDriver extends Omit<CoordinatorDriver, 'canInvite' | 'hasDevice'> {
  readonly inviteFacts: DriverInviteFacts;
}

export interface DashboardSnapshot {
  readonly stand: CoordinatorDashboardView['stand'];
  readonly inviteScope: DriverInviteScope;
  readonly drivers: readonly DashboardDriver[];
  readonly bookings: readonly CoordinatorBooking[];
  readonly changes: readonly QueueChange[];
}

export interface CoordinatorDashboardReader {
  read(scope: DashboardScope): Promise<ApplicationResult<DashboardSnapshot>>;
}

export type { QueueChange } from '../contracts/coordinator-dashboard-view';
