import { expect, test } from 'vitest';
import type { Transaction } from '@application/ports/unit-of-work';
import { Instant } from '@domain/shared/instant.value-object';
import { createLicence } from '@domain/town/licence';
import { Town } from '@domain/town/town';
import { DEMO_STAND, DEMO_TOWN, NOW, QUEUE, TOWN } from './demo-data.fixtures';
import { createDemo, quoteInput, requestInput, unwrap, type Demo } from './demo.fixtures';

async function makeLiveTown(app: Demo) {
  const licence = unwrap(
    createLicence({
      ulin: 'fixture-ulin',
      issuingAuthority: 'Fixture Authority',
      validFromDate: '2026-11-24',
      validThroughDate: '2026-11-24',
    }),
  );
  const town = unwrap(Town.create({ townId: TOWN, licence }).withBookingMode('live', NOW));
  const liveStand = {
    townId: TOWN,
    standId: DEMO_STAND.standId,
    pickupCues: DEMO_STAND.pickupCues,
    neighbourStandIds: DEMO_STAND.neighbourStandIds,
    coordinatorContact: DEMO_STAND.coordinatorContact,
  };
  const makeLive = async ({ towns, stands, drivers }: Transaction) => {
    unwrap(await towns.save({ ...DEMO_TOWN, town }, 1));
    unwrap(await stands.save(liveStand, 1));
    for (const entry of QUEUE) unwrap(await drivers.save({ townId: TOWN, entry }, 1));
    return { ok: true as const, value: undefined };
  };
  unwrap(await app.unitOfWork.run(makeLive));
  return licence;
}

test('a licensed live Town quotes and dispatches in its live scope', async () => {
  const app = await createDemo();
  const licence = await makeLiveTown(app);
  const SECOND_MS = 1_000;
  app.clock.set(
    unwrap(Instant.fromEpochMilliseconds(licence.endsAt.epochMilliseconds - SECOND_MS)),
  );
  expect(await app.quoteFare.execute(quoteInput)).toMatchObject({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
  const quote = unwrap(await app.quoteFare.execute({ ...quoteInput, demoRunId: undefined }));
  const { bookingId } = unwrap(
    await app.requestRide.execute({ ...requestInput, quoteId: quote.quoteId }),
  );
  expect(unwrap(await app.advanceDispatch.execute({ bookingId })).status).toBe('offering');
  expect(
    unwrap(await app.getBookingStatusForRider.execute({ bookingId, riderId: quoteInput.riderId })),
  ).toMatchObject({ capability: { kind: 'live', ulin: 'fixture-ulin' }, status: 'offering' });

  app.clock.set(licence.endsAt);
  expect(unwrap(await app.advanceDispatch.execute({ bookingId })).noDriverFoundReason).toBe(
    'booking_unavailable',
  );
  expect(
    unwrap(await app.getBookingStatusForRider.execute({ bookingId, riderId: quoteInput.riderId })),
  ).toMatchObject({ status: 'no_driver_found', coordinatorContact: DEMO_STAND.coordinatorContact });
  expect(unwrap(await app.getTownOverview.execute({ slug: DEMO_TOWN.slug })).capability).toEqual({
    kind: 'information_only',
    reason: 'licence_expired',
  });
});
