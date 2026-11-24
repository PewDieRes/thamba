import { expect, test } from 'vitest';
import {
  createDemo,
  driverCommand,
  acceptRide,
} from '../../../../tests/unit/application/demo.fixtures';

test('RejoinQueue applies its Demo Town rules', async () => {
  const app = await createDemo();
  const { booking } = await acceptRide(app);
  expect(await app.rejoinQueue.execute(driverCommand)).toMatchObject({
    ok: false,
    error: { code: 'driver_on_trip' },
  });
  expect(booking.status).toBe('accepted');
});
