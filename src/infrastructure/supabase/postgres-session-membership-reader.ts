import type { SessionMembershipReader } from '@application/ports/session-membership-reader';
import type { SessionSubject } from '@domain/shared/ids.value-object';
import type { Sql } from 'postgres';
import {
  fromCoordinatorMembership,
  type CoordinatorMembershipRow,
} from './coordinator-membership.mapper';

export class PostgresSessionMembershipReader implements SessionMembershipReader {
  constructor(private readonly sql: Sql) {}

  async hasDriverDevice(subject: SessionSubject) {
    try {
      const [row] = await this.sql<{ active: boolean }[]>`
        select public.thamba_has_driver_device(${subject}) as active
      `;
      return row?.active ?? false;
    } catch {
      return false;
    }
  }

  async listCoordinatorMemberships(subject: SessionSubject) {
    try {
      const rows = await this.sql<CoordinatorMembershipRow[]>`
        select id, town_id, run_scope_id, stand_id from public.thamba_coordinator_memberships(${subject})
      `;
      return rows.map(fromCoordinatorMembership);
    } catch {
      return [];
    }
  }
}
