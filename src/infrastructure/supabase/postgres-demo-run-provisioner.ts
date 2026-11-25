import type {
  DemoRunProvisioner,
  DemoRunProvisioning,
} from '@application/ports/demo-run-provisioner';
import { PostgresError, type Sql } from 'postgres';
import { toDemoDriverRow, toDemoStandRow } from './demo-run.mapper';
import { getWriteFailure, SAVED, StorageFailure } from './repository-storage';

const NOT_FOUND = { ok: false, error: { code: 'not_found' } } as const;

export class PostgresDemoRunProvisioner implements DemoRunProvisioner {
  constructor(private readonly sql: Sql) {}

  async provision({ run, stand, drivers }: DemoRunProvisioning) {
    try {
      const [row] = await this.sql<{ created: boolean }[]>`
        select public.thamba_provision_demo_run(
          ${run.townId}, ${run.riderId}, ${run.demoRunId}, ${stand.standId},
          ${new Date(run.expiresAtEpochMilliseconds).toISOString()},
          ${this.sql.json(toDemoStandRow(stand))},
          ${this.sql.json(drivers.map(toDemoDriverRow))}
        ) as created
      `;
      return row?.created ? SAVED : NOT_FOUND;
    } catch (error) {
      return getWriteFailure(
        new StorageFailure(error instanceof PostgresError ? error.code : undefined),
      );
    }
  }
}
