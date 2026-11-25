import { expect, test, vi } from 'vitest';
import { SubmitDemoComplaint } from '@application/use-cases/submit-demo-complaint/submit-demo-complaint.use-case';
import { createSubmitDemoComplaintSchema } from '@application/use-cases/submit-demo-complaint/submit-demo-complaint.input';
import { zodInputSchema } from '@infrastructure/composition/zod-input-schema';
import { DEMO_RUN, SUBJECT_ONE, NOW, TOWN, uuid } from '../../demo-data.fixtures';
import type { DemoComplaintWriter } from '@application/ports/demo-complaint-writer';

test('binds the complaint to the authenticated Rider and validates the category', async () => {
  const save = vi
    .fn<DemoComplaintWriter['save']>()
    .mockResolvedValue({ ok: true, value: undefined });
  const useCase = new SubmitDemoComplaint(
    {
      actorContext: {
        getActor: () =>
          Promise.resolve({ kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: false }),
      },
      clock: { now: () => NOW },
      complaints: { save },
    },
    createSubmitDemoComplaintSchema(zodInputSchema),
  );
  const input = { townId: TOWN, demoRunId: DEMO_RUN, complaintId: uuid(110) };
  expect(await useCase.execute({ ...input, topic: 'fare' })).toMatchObject({ ok: true });
  expect(save).toHaveBeenCalledWith({ ...input, topic: 'fare', riderId: SUBJECT_ONE, now: NOW });
  expect(await useCase.execute({ ...input, topic: 'other' })).toMatchObject({ ok: false });
  expect(save).toHaveBeenCalledTimes(1);
});
