import { expect, test } from 'vitest';
import { createDemo, requestRide } from '../../demo.fixtures';

test('AdvanceDispatch applies its Demo Town rules', async () => {
  const app = await createDemo();
  const booking = await requestRide(app);
  const commands = await Promise.all([
    app.advanceDispatch.execute({ bookingId: booking.bookingId }),
    app.advanceDispatch.execute({ bookingId: booking.bookingId }),
  ]);
  expect(commands).toEqual(
    commands.map(() => ({ ok: true, value: { bookingId: booking.bookingId, status: 'offering' } })),
  );
  expect(
    (await app.events()).filter(({ event }) => event.type === 'RideOfferCreated'),
  ).toHaveLength(1);
});
