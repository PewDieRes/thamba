import type {
  DemoRunProvisioner,
  DemoRunProvisioning,
} from '@application/ports/demo-run-provisioner';
import type { Sql } from 'postgres';
import { SAVED, UNAVAILABLE } from './repository-storage';

const NOT_FOUND = { ok: false, error: { code: 'not_found' } } as const;

export class PostgresDemoRunProvisioner implements DemoRunProvisioner {
  constructor(private readonly sql: Sql) {}

  async provision({ townId, riderId, demoRunId, standId, templateStandId }: DemoRunProvisioning) {
    try {
      const [row] = await this.sql<{ created: boolean }[]>`
        select public.thamba_provision_demo_run(
          ${townId}, ${riderId}, ${demoRunId}, ${standId}, ${templateStandId}
        ) as created
      `;
      return row?.created ? SAVED : NOT_FOUND;
    } catch {
      return UNAVAILABLE;
    }
  }
}
