import type { CoordinatorDirectory } from '@application/ports/coordinator-directory';
import type { Sql } from 'postgres';
import { UNAVAILABLE } from './repository-storage';

export class PostgresCoordinatorDirectory implements CoordinatorDirectory {
  constructor(private readonly sql: Sql) {}

  async isActiveCoordinator(email: string) {
    try {
      const [row] = await this.sql<{ approved: boolean }[]>`
        select public.thamba_is_coordinator_email(${email}) as approved
      `;
      return row ? { ok: true as const, value: row.approved } : UNAVAILABLE;
    } catch {
      return UNAVAILABLE;
    }
  }
}
