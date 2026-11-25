import type { CoordinatorMembership } from '@application/ports/actor-context';
import { readScope } from './row.mapper';

export interface CoordinatorMembershipRow {
  readonly id: string;
  readonly town_id: string;
  readonly run_scope_id: string;
  readonly stand_id: string;
}

export function fromCoordinatorMembership(row: CoordinatorMembershipRow): CoordinatorMembership {
  return {
    ...readScope(row.town_id, row.run_scope_id),
    coordinatorId: row.id as CoordinatorMembership['coordinatorId'],
    standId: row.stand_id as CoordinatorMembership['standId'],
  };
}
