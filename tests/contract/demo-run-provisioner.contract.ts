import { describe, expect, test } from 'vitest';
import type { DemoRunProvisioner } from '@application/ports/demo-run-provisioner';
import type { UnitOfWork } from '@application/ports/unit-of-work';
import { ok } from '@domain/shared/result';
import { createDemoRunId, createStandId } from '@domain/shared/ids.value-object';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import {
  DEMO_STAND,
  DRIVER_ONE,
  DRIVER_TWO,
  PICKUP,
  RIDER,
  TOWN,
  uuid,
} from '../unit/application/demo-data.fixtures';

const scope = { townId: TOWN, demoRunId: unwrap(createDemoRunId(uuid(101))) };
const run = { ...scope, riderId: RIDER, expiresAtEpochMilliseconds: Date.UTC(2099, 0, 1) };
const stand = {
  ...DEMO_STAND,
  ...scope,
  standId: unwrap(createStandId(uuid(102))),
  name: 'Demo Stand',
  names: { mr: 'डेमो स्टँड' },
  pickupCueTranslations: { [PICKUP]: { mr: 'निळ्या फलकाजवळ भेटा.' } },
};
const drivers = [
  {
    ...scope,
    demoDriver: { name: 'Driver One', names: { mr: 'चालक एक' }, vehicleNumber: 'DEMO 01' },
    entry: { driverId: DRIVER_ONE, standId: stand.standId, availability: 'online', queuedAt: 42n },
    simulationSteps: { accept: 2, arrive: 3, start: 3, complete: 5 },
  },
  {
    ...scope,
    demoDriver: { name: 'Driver Two', names: {}, vehicleNumber: 'DEMO 02' },
    entry: { driverId: DRIVER_TWO, standId: stand.standId, availability: 'online', queuedAt: 43n },
    simulationSteps: { decline: 2 },
  },
] as const;

interface Persistence {
  readonly demoRuns: DemoRunProvisioner;
  readonly unitOfWork: UnitOfWork;
}

export function demoRunProvisionerContract(prepare: () => Promise<Persistence>) {
  describe('Demo Run provisioner', () => {
    test('persists the supplied run, Stand and scripted roster', async () => {
      const { demoRuns, unitOfWork } = await prepare();
      expect(await demoRuns.provision({ run, stand, drivers })).toEqual(ok(undefined));
      const saved = await readRun(unitOfWork);
      expect(saved).toEqual({
        runs: [{ demoRunId: run.demoRunId, riderId: run.riderId }],
        stand,
        drivers: drivers.map((driver) => ({ ...driver, isSynthetic: true })),
      });
    });

    test('rolls back the run and Stand if a roster entry conflicts', async () => {
      const { demoRuns, unitOfWork } = await prepare();
      expect(await demoRuns.provision({ run, stand, drivers: [drivers[0], drivers[0]] })).toEqual({
        ok: false,
        error: { code: 'ConcurrencyConflict' },
      });
      const saved = unwrap(
        await unitOfWork.run(
          async (tx) =>
            ok({
              runs: (await tx.towns.get(TOWN))?.value.demoRuns,
              stand: await tx.stands.get(stand.standId),
              driver: await tx.drivers.get(DRIVER_ONE),
            }),
          { target: { kind: 'town', townId: TOWN } },
        ),
      );
      expect(saved).toEqual({ runs: [], stand: undefined, driver: undefined });
      expect(await demoRuns.provision({ run, stand, drivers })).toEqual(ok(undefined));
    });
  });
}

async function readRun(unitOfWork: UnitOfWork) {
  return unwrap(
    await unitOfWork.run(
      async (tx) => {
        const town = (await tx.towns.get(TOWN))?.value;
        const roster = await tx.drivers.listForStands(scope, [stand.standId]);
        return ok({
          runs: town?.demoRuns.map(({ demoRunId, riderId }) => ({ demoRunId, riderId })),
          stand: (await tx.stands.get(stand.standId))?.value,
          drivers: roster
            .map(({ value }) => value)
            .sort((a, b) => a.entry.driverId.localeCompare(b.entry.driverId)),
        });
      },
      { target: { kind: 'town', ...scope } },
    ),
  );
}
