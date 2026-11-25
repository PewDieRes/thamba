import type { ApplicationResult } from '@application/ports/application-result';
import type { DemoComplaint, DemoComplaintWriter } from '@application/ports/demo-complaint-writer';
import type { Sql } from 'postgres';
import { SAVED, UNAVAILABLE } from './repository-storage';

export class PostgresDemoComplaintWriter implements DemoComplaintWriter {
  constructor(private readonly sql: Sql) {}

  async save({
    riderId,
    townId,
    demoRunId,
    complaintId,
    topic,
  }: DemoComplaint): Promise<ApplicationResult<void>> {
    try {
      const [row] = await this.sql<{ result: string }[]>`
        select public.thamba_submit_demo_complaint(${riderId}, ${townId}, ${demoRunId}, ${complaintId}, ${topic}) as result
      `;
      switch (row?.result) {
        case 'saved':
          return SAVED;
        case 'forbidden':
        case 'idempotency_key_reused':
          return { ok: false, error: { code: row.result } };
        default:
          return UNAVAILABLE;
      }
    } catch {
      return UNAVAILABLE;
    }
  }
}
