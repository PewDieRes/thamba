import { expect, test } from 'vitest';
import { createDemo, requestRide } from '../../../../tests/unit/application/demo.fixtures';

test('RequestRide applies its Demo Town rules', async () => {
  const app = await createDemo();
  expect(await requestRide(app)).toMatchObject({ status: 'requested' });
});
