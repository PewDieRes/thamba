import { expect, test } from 'vitest';
import {
  createDemo,
  quoteInput,
  dispatchRide,
  driverCommand,
  DRIVER_ONE,
} from '../../demo.fixtures';

test('SetDriverAvailability applies its Demo Town rules', async () => {
  const app = await createDemo();
  const { booking } = await dispatchRide(app);
  expect(
    await app.setDriverAvailability.execute({
      commandKey: driverCommand.commandKey,
      actor: { type: 'driver', subject: driverCommand.subject },
      driverId: DRIVER_ONE,
      isOnline: false,
    }),
  ).toMatchObject({ ok: true, value: { availability: 'offline' } });
  expect(
    await app.getBookingStatusForRider.execute({
      bookingId: booking.bookingId,
      riderId: quoteInput.riderId,
    }),
  ).toMatchObject({ ok: true, value: { status: 'requested' } });
});
