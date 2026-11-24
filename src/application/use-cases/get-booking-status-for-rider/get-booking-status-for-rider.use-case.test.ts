import { expect, test } from 'vitest';
import {
  createDemo,
  quoteInput,
  dispatchRide,
  DRIVER_ONE,
} from '../../../../tests/unit/application/demo.fixtures';

test('GetBookingStatusForRider applies its Demo Town rules', async () => {
  const app = await createDemo();
  const { booking } = await dispatchRide(app);
  expect(
    await app.getBookingStatusForRider.execute({
      bookingId: booking.bookingId,
      riderId: DRIVER_ONE,
    }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
  expect(
    await app.getBookingStatusForRider.execute({
      bookingId: booking.bookingId,
      riderId: quoteInput.riderId,
    }),
  ).toMatchObject({ ok: true, value: { status: 'offering' } });
});
