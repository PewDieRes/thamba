import { expect, test } from 'vitest';
import { createDemo, startTrip } from '../../../../tests/unit/application/demo.fixtures';

test('CompleteTrip applies its Demo Town rules', async () => {
  const app = await createDemo();
  const input = await startTrip(app);
  expect(await app.completeTrip.execute({ ...input, commandKey: 'complete' })).toMatchObject({
    ok: true,
    value: { status: 'completed' },
  });
});
