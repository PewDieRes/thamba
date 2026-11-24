import { expect, test } from 'vitest';
import {
  createDemo,
  unwrap,
  driverCommand,
  acceptRide,
} from '../../../../tests/unit/application/demo.fixtures';

test('StartTrip applies its Demo Town rules', async () => {
  const app = await createDemo();
  const { booking } = await acceptRide(app);
  const input = { ...driverCommand, bookingId: booking.bookingId };
  unwrap(await app.markDriverArrived.execute(input));
  expect(await app.startTrip.execute({ ...input, commandKey: 'start' })).toMatchObject({
    ok: true,
    value: { status: 'in_trip' },
  });
});
