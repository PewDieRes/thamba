import type {
  CoordinatorDashboardReader,
  DashboardScope,
  DashboardSnapshot,
} from '@application/ports/coordinator-dashboard-reader';
import type { ActorContext } from '@application/ports/actor-context';
import type { ApplicationResult } from '@application/ports/application-result';
import type { MemoryStore } from './memory-store';
import { mapMemoryDashboard } from './coordinator-dashboard.mapper';

export class InMemoryCoordinatorDashboardReader implements CoordinatorDashboardReader {
  constructor(
    private readonly readSnapshot: () => MemoryStore,
    private readonly actors: ActorContext,
  ) {}

  async read(scope: DashboardScope): Promise<ApplicationResult<DashboardSnapshot>> {
    const { subject, membership } = scope;
    const actor = await this.actors.getActor();
    const allowed =
      actor?.kind === 'coordinator' &&
      actor.subject === subject &&
      actor.memberships.some(
        (member) =>
          member.coordinatorId === membership.coordinatorId &&
          member.standId === membership.standId &&
          member.townId === membership.townId &&
          member.demoRunId === membership.demoRunId,
      );
    const dashboard = allowed ? mapMemoryDashboard(this.readSnapshot(), scope) : undefined;
    return dashboard ? { ok: true, value: dashboard } : { ok: false, error: { code: 'forbidden' } };
  }
}
