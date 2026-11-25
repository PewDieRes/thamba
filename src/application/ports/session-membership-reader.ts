import type { SessionSubject } from '@domain/shared/ids.value-object';
import type { CoordinatorMembership } from './actor-context';

export interface SessionMembershipReader {
  hasDriverDevice(subject: SessionSubject): Promise<boolean>;
  listCoordinatorMemberships(subject: SessionSubject): Promise<readonly CoordinatorMembership[]>;
}
