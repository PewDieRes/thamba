import { expect, test, vi } from 'vitest';
import { createDemo } from '../../demo.fixtures';
import { DEMO_STAND, MALVAN_TOWN, SUBJECT_ONE, TOWN } from '../../demo-data.fixtures';

test('starts an isolated Demo Run for the verified anonymous Rider', async () => {
  const provision = vi.fn(() => Promise.resolve({ ok: true as const, value: undefined }));
  const app = await createDemo({
    actorContext: {
      getActor: () =>
        Promise.resolve({ kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: false }),
    },
    demoRuns: { provision },
  });
  const result = await app.startDemoRun.execute({ townId: TOWN, standId: DEMO_STAND.standId });
  expect(result).toMatchObject({ ok: true });
  expect(provision).toHaveBeenCalledWith(
    expect.objectContaining({ riderId: SUBJECT_ONE, townId: TOWN }),
  );
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
