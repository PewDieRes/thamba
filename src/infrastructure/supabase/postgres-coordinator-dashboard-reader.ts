import type {
  CoordinatorDashboardReader,
  DashboardScope,
  DashboardSnapshot,
} from '@application/ports/coordinator-dashboard-reader';
import type { Sql } from 'postgres';
import { UNAVAILABLE } from './repository-storage';

export class PostgresCoordinatorDashboardReader implements CoordinatorDashboardReader {
  constructor(private readonly sql: Sql) {}

  async read({ subject, membership, dayStart, dayEnd }: DashboardScope) {
    try {
      const { coordinatorId, standId, townId, demoRunId } = membership;
      const [row] = await this.sql<{ dashboard: DashboardSnapshot | null }[]>`
        select public.thamba_coordinator_dashboard(
          ${subject}, ${coordinatorId}, ${standId}, ${townId}, ${demoRunId ?? null},
          ${new Date(dayStart).toISOString()}, ${new Date(dayEnd).toISOString()}
        ) as dashboard
      `;
      return row?.dashboard
        ? ({ ok: true, value: row.dashboard } as const)
        : ({ ok: false, error: { code: 'forbidden' } } as const);
    } catch {
      return UNAVAILABLE;
    }
  }
}
