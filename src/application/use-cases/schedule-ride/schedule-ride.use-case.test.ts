import { expect, test } from 'vitest';
import {
  createDemo,
  quoteInput,
  requestInput,
  unwrap,
  NOW_MS,
  HOUR_MS,
} from '../../../../tests/unit/application/demo.fixtures';

test('ScheduleRide applies its Demo Town rules', async () => {
  const app = await createDemo();
  const quote = unwrap(
    await app.quoteFare.execute({ ...quoteInput, pickupAtEpochMilliseconds: NOW_MS + HOUR_MS }),
  );
  expect(await app.scheduleRide.execute({ ...requestInput, quoteId: quote.quoteId })).toMatchObject(
    { ok: true, value: { status: 'scheduled' } },
  );
});
