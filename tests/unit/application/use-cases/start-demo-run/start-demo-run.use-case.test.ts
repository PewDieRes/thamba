import type { AuthSession } from '@application/ports/auth-session';
import type { UnitOfWork } from '@application/ports/unit-of-work';
import type { DemoRunProvisioner } from '@application/ports/demo-run-provisioner';
import { buildDemoRun } from '@application/use-cases/start-demo-run/demo-scenario';
import { createDemoRunId, createStandId } from '@domain/shared/ids.value-object';
import { expect, test, vi } from 'vitest';
import { createDemo, unwrap } from '../../demo.fixtures';
import {
  DEMO_STAND,
  MALVAN_TOWN,
  SUBJECT_ONE,
  TOWN,
  uuid,
  DRIVER_ONE,
  NOW,
  RIDER,
} from '../../demo-data.fixtures';

test('starts an isolated Demo Run for the verified anonymous Rider', async () => {
  const provision = vi.fn<DemoRunProvisioner['provision']>(() =>
    Promise.resolve({ ok: true, value: undefined }),
  );
  const ensureAnonymous = vi
    .fn<AuthSession['ensureAnonymous']>()
    .mockResolvedValue({ ok: true, value: undefined });
  const app = await createDemo({
    demoSession: { ensureAnonymous },
    actorContext: {
      getActor: () =>
        Promise.resolve({ kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: false }),
    },
    demoRuns: { provision },
  });
  const standId = await seedTemplateStand(app.unitOfWork);
  const scope = unwrap(await app.startDemoRun.execute({ townId: TOWN, standId }));
  expect(ensureAnonymous).toHaveBeenCalledOnce();
  expect(provision).toHaveBeenCalledTimes(1);
  const [fixtures] = provision.mock.calls[0] ?? [];
  expect(fixtures?.run).toMatchObject({
    riderId: SUBJECT_ONE,
    demoRunId: scope.demoRunId,
    townId: TOWN,
  });
  expect(fixtures?.stand).toMatchObject({
    standId: scope.standId,
    pickupCues: DEMO_STAND.pickupCues,
    neighbourStandIds: [],
  });
  expect(fixtures?.drivers).toMatchObject([
    {
      simulationSteps: { accept: 2, arrive: 3, start: 3, complete: 5 },
      entry: { availability: 'online', standId: scope.standId },
    },
  ]);
});

test('denies a Demo Run for Malvan', async () => {
  const provision = vi.fn();
  const app = await createDemo({
    actorContext: {
      getActor: () =>
        Promise.resolve({ kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: false }),
    },
    demoRuns: { provision },
  });
  expect(
    await app.startDemoRun.execute({
      townId: MALVAN_TOWN.town.townId,
      standId: DEMO_STAND.standId,
    }),
  ).toMatchObject({ ok: false });
  expect(provision).not.toHaveBeenCalled();
});

test('builds queue exhaustion with a scripted decline in an isolated roster', () => {
  const standId = unwrap(createStandId(uuid(104)));
  const demoRunId = unwrap(createDemoRunId(uuid(105)));
  const fixtures = buildDemoRun('queue_exhaustion', {
    templateStand: { ...DEMO_STAND, neighbourStandIds: [standId] },
    standId,
    demoRunId,
    riderId: RIDER,
    driverId: DRIVER_ONE,
    now: NOW,
  });
  expect(fixtures.stand).toMatchObject({ standId, demoRunId, neighbourStandIds: [] });
  expect(fixtures.drivers).toMatchObject([
    { demoRunId, simulationSteps: { decline: 2 }, entry: { standId, driverId: DRIVER_ONE } },
  ]);
});

async function seedTemplateStand(unitOfWork: UnitOfWork) {
  const standId = unwrap(createStandId(uuid(103)));
  const { coordinatorContact, pickupCues } = DEMO_STAND;
  unwrap(
    await unitOfWork.run(({ stands }) =>
      stands.save(
        {
          townId: TOWN,
          standId,
          coordinatorContact,
          pickupCues,
          neighbourStandIds: [],
        },
        null,
      ),
    ),
  );
  return standId;
}

test('provisions the selected queue exhaustion scenario', async () => {
  const provision = vi.fn<DemoRunProvisioner['provision']>(() =>
    Promise.resolve({ ok: true, value: undefined }),
  );
  const app = await createDemo({
    actorContext: {
      getActor: () =>
        Promise.resolve({ kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: false }),
    },
    demoRuns: { provision },
  });
  const standId = await seedTemplateStand(app.unitOfWork);
  unwrap(await app.startDemoRun.execute({ townId: TOWN, standId, scenario: 'queue_exhaustion' }));
  expect(provision.mock.calls[0]?.[0].drivers[0]?.simulationSteps).toEqual({ decline: 2 });
});

test('starts an anonymous session before provisioning and propagates session failures', async () => {
  const ensureAnonymous = vi
    .fn<AuthSession['ensureAnonymous']>()
    .mockResolvedValue({ ok: false, error: { code: 'rate_limit_exceeded' } });
  const provision = vi
    .fn<DemoRunProvisioner['provision']>()
    .mockResolvedValue({ ok: true, value: undefined });
  const app = await createDemo({ demoSession: { ensureAnonymous }, demoRuns: { provision } });
  const standId = await seedTemplateStand(app.unitOfWork);
  expect(await app.startDemoRun.execute({ townId: TOWN, standId })).toEqual({
    ok: false,
    error: { code: 'rate_limit_exceeded' },
  });
  expect(ensureAnonymous).toHaveBeenCalledOnce();
  expect(provision).not.toHaveBeenCalled();
});
