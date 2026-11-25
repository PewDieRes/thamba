import type { DemoComplaint, DemoComplaintWriter } from '@application/ports/demo-complaint-writer';
import type { ApplicationResult } from '@application/ports/application-result';
import type { UnitOfWork } from '@application/ports/unit-of-work';

export class InMemoryDemoComplaintWriter implements DemoComplaintWriter {
  private readonly complaints = new Map<string, DemoComplaint>();

  constructor(private readonly unitOfWork: UnitOfWork) {}

  async save(complaint: DemoComplaint): Promise<ApplicationResult<void>> {
    const { townId, demoRunId, riderId, complaintId, topic, now } = complaint;
    const allowed = await this.unitOfWork.run(async ({ towns }) => {
      const town = (await towns.get(townId))?.value;
      const run = town?.demoRuns.find(
        (item) => item.demoRunId === demoRunId && item.riderId === riderId,
      );
      return {
        ok: true,
        value: Boolean(
          run?.expiresAtEpochMilliseconds && run.expiresAtEpochMilliseconds > now.epochMilliseconds,
        ),
      };
    });
    if (!allowed.ok) return allowed;
    if (!allowed.value) return { ok: false, error: { code: 'forbidden' } };
    const key = JSON.stringify([townId, demoRunId, complaintId]);
    const existing = this.complaints.get(key);
    if (existing && existing.topic !== topic)
      return { ok: false, error: { code: 'idempotency_key_reused' } };
    if (!existing) this.complaints.set(key, complaint);
    return { ok: true, value: undefined };
  }
}
