import type {
  DemoRunProvisioner,
  DemoRunProvisioning,
} from '@application/ports/demo-run-provisioner';
import type { UnitOfWork } from '@application/ports/unit-of-work';

export class InMemoryDemoRunProvisioner implements DemoRunProvisioner {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  provision({ townId, riderId, demoRunId, standId, templateStandId }: DemoRunProvisioning) {
    return this.unitOfWork.run(async (tx) => {
      const town = await tx.towns.get(townId);
      const stand = (await tx.stands.get(templateStandId))?.value;
      if (!town || !stand || stand.townId !== townId || stand.demoRunId !== undefined) {
        return { ok: false, error: { code: 'not_found' } };
      }
      const saved = await tx.towns.save(
        {
          ...town.value,
          demoRuns: [...town.value.demoRuns, { riderId, demoRunId }],
        },
        town.version,
      );
      if (!saved.ok) return saved;
      return tx.stands.save({ ...stand, demoRunId, standId, neighbourStandIds: [] }, null);
    });
  }
}
