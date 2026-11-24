import { expect, test } from 'vitest';
import { createDemo, driverCommand, acceptRide } from '../../demo.fixtures';

test('MarkDriverArrived applies its Demo Town rules', async () => {
  const app = await createDemo();
  const { booking } = await acceptRide(app);
  expect(
    await app.markDriverArrived.execute({ ...driverCommand, bookingId: booking.bookingId }),
  ).toMatchObject({ ok: true, value: { status: 'driver_arrived' } });
});
