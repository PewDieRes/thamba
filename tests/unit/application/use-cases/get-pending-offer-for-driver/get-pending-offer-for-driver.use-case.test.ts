import { expect, test } from 'vitest';
import { createDemo, unwrap, dispatchRide, driverCommand } from '../../demo.fixtures';

test('GetPendingOfferForDriver applies its Demo Town rules', async () => {
  const app = await createDemo();
  await dispatchRide(app);
  expect(
    Object.keys(
      unwrap(await app.getPendingOfferForDriver.execute({ subject: driverCommand.subject })) ?? {},
    ).sort(),
  ).toEqual(['expiresAtEpochMilliseconds', 'offerId', 'pickupCue', 'pickupLandmarkId']);
});
