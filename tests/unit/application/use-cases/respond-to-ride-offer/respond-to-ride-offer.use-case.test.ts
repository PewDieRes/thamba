import { expect, test } from 'vitest';
import { createDemo, dispatchRide, driverCommand } from '../../demo.fixtures';

test('RespondToRideOffer applies its Demo Town rules', async () => {
  const app = await createDemo();
  const { offer } = await dispatchRide(app);
  expect(
    await app.respondToRideOffer.execute({
      ...driverCommand,
      offerId: offer.offerId,
      action: 'decline',
    }),
  ).toMatchObject({ ok: true, value: { status: 'requested' } });
});
