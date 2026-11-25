import { expect, test } from 'vitest';
import { DEMO_STAND, DEMO_TOWN, DESTINATION, NOW_MS, PICKUP } from '../../demo-data.fixtures';
import { createDemo, unwrap, dispatchRide, driverCommand } from '../../demo.fixtures';

test('GetPendingOfferForDriver applies its Demo Town rules', async () => {
  const app = await createDemo();
  await dispatchRide(app);
  expect(
    Object.keys(
      unwrap(await app.getPendingOfferForDriver.execute({ subject: driverCommand.subject })) ?? {},
    ).sort(),
  ).toEqual([
    'expiresAtEpochMilliseconds',
    'offerId',
    'pickupCue',
    'pickupLandmarkId',
    'remainingMilliseconds',
    'serverNow',
  ]);
});

const DESTINATION_LANDMARK = {
  id: DESTINATION,
  slug: 'garden',
  name: 'Garden',
  names: {},
  isIllustrative: false,
};

test('Driver display payload contains only pickup fields and expiry', async () => {
  const app = await createDemo();
  const pickup = {
    id: PICKUP,
    slug: 'river',
    name: 'River Square',
    names: { mr: 'नदी चौक' },
    isIllustrative: false,
  };
  unwrap(
    await app.unitOfWork.run(async ({ towns, stands }) => {
      const stand = await stands.save(
        {
          ...DEMO_STAND,
          pickupCueTranslations: { [PICKUP]: { mr: 'निळ्या पाटीजवळ' } },
        },
        1,
      );
      if (!stand.ok) return stand;
      return towns.save({ ...DEMO_TOWN, landmarks: [pickup, DESTINATION_LANDMARK] }, 1);
    }),
  );
  const { offer } = await dispatchRide(app);
  const display = unwrap(
    await app.getPendingOfferForDriver.execute({
      subject: driverCommand.subject,
      includeDisplay: true,
    }),
  );
  expect(JSON.parse(JSON.stringify(display)) as unknown).toEqual({
    offerId: expect.any(String) as unknown,
    pickupLandmarkId: expect.any(String) as unknown,
    pickup: { name: 'River Square', names: { mr: 'नदी चौक' } },
    pickupCue: 'Meet by the blue sign',
    pickupCueTranslations: { mr: 'निळ्या पाटीजवळ' },
    expiresAtEpochMilliseconds: offer.expiresAtEpochMilliseconds,
    serverNow: NOW_MS,
    remainingMilliseconds: offer.expiresAtEpochMilliseconds - NOW_MS,
  });
});
