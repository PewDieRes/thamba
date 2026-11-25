import type {
  DemoRunProvisioner,
  DemoRunProvisioning,
} from '@application/ports/demo-run-provisioner';
import type { UnitOfWork } from '@application/ports/unit-of-work';

export class InMemoryDemoRunProvisioner implements DemoRunProvisioner {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  provision({ run, stand, drivers }: DemoRunProvisioning) {
    return this.unitOfWork.run(async (tx) => {
      const town = await tx.towns.get(run.townId);
      if (!town?.value.town.simulationProfile || town.value.town.bookingMode !== 'simulated') {
        return { ok: false, error: { code: 'not_found' } };
      }
      if (town.value.demoRuns.some(({ demoRunId }) => demoRunId === run.demoRunId)) {
        return { ok: false, error: { code: 'ConcurrencyConflict' } };
      }
      const { demoRunId, riderId, expiresAtEpochMilliseconds } = run;
      const membership = { demoRunId, riderId, expiresAtEpochMilliseconds };
      const saved = await tx.towns.save(
        {
          ...town.value,
          demoRuns: [...town.value.demoRuns, membership],
        },
        town.version,
      );
      if (!saved.ok) return saved;
      const savedStand = await tx.stands.save(stand, null);
      if (!savedStand.ok) return savedStand;
      for (const driver of drivers) {
        const savedDriver = await tx.drivers.save(driver, null);
        if (!savedDriver.ok) return savedDriver;
      }
      return savedStand;
    });
  }
}
