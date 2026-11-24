import { expect, test } from 'vitest';
import { createDemo, quoteInput, dispatchRide, driverCommand } from '../../demo.fixtures';

test('CancelBooking applies its Demo Town rules', async () => {
  const app = await createDemo();
  const { booking } = await dispatchRide(app);
  const actor = { type: 'rider', riderId: quoteInput.riderId };
  expect(
    await app.cancelBooking.execute({ actor, bookingId: booking.bookingId, commandKey: 'cancel' }),
  ).toMatchObject({ ok: true, value: { status: 'cancelled_by_rider' } });
  expect(await app.getPendingOfferForDriver.execute({ subject: driverCommand.subject })).toEqual({
    ok: true,
    value: undefined,
  });
});
