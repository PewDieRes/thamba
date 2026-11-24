import { expect, test } from 'vitest';
import type { Transaction } from '@application/ports/unit-of-work';
import { createDemoRunId, createStandId } from '@domain/shared/ids.value-object';
import { ok } from '@domain/shared/result';
import { duration } from '../domain/dispatch/booking.fixtures';
import {
  DEMO_STAND,
  DEMO_TOWN,
  DRIVER_ONE,
  DRIVER_TWO,
  HOUR_MS,
  NOW_MS,
  SCOPE,
  STAND,
  SUBJECT_ONE,
  SUBJECT_TWO,
  uuid,
} from './demo-data.fixtures';
import { createDemo, dispatchRide, requestRide, unwrap } from './demo.fixtures';
import { MINUTE_MS, DISPATCH_DEADLINE_MS, OTHER_STAND, at, write } from './dispatch-edge.fixtures';

test('advancement at offer expiry replans once and respects the original dispatch deadline', async () => {
  const app = await createDemo();
  const { booking, offer } = await dispatchRide(app);
  at(app, offer.expiresAtEpochMilliseconds - NOW_MS);
  expect(
    unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_ONE })),
  ).toBeUndefined();
  expect(unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId })).status).toBe(
    'offering',
  );
  const next = unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_TWO }));
  expect(next?.expiresAtEpochMilliseconds).toBe(NOW_MS + DISPATCH_DEADLINE_MS);
  at(app, DISPATCH_DEADLINE_MS);
  expect(unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId }))).toMatchObject(
    {
      status: 'no_driver_found',
      noDriverFoundReason: 'dispatch_deadline',
    },
  );
});

test.each([MINUTE_MS, DISPATCH_DEADLINE_MS])(
  'an accept at %i ms commits expiry and replays the rejection',
  async (elapsed) => {
    const app = await createDemo();
    const { booking, offer } = await dispatchRide(app);
    expect(
      await app.respondToRideOffer.execute({
        subject: SUBJECT_TWO,
        offerId: offer.offerId,
        action: 'accept',
        commandKey: 'accept',
      }),
    ).toMatchObject({ ok: false, error: { code: 'not_found' } });
    at(app, elapsed);
    const input = {
      subject: SUBJECT_ONE,
      offerId: offer.offerId,
      action: 'accept',
      commandKey: 'accept',
    };
    const expired = { ok: false, error: { code: 'offer_expired' } };
    expect(await app.respondToRideOffer.execute(input)).toEqual(expired);
    expect(await app.respondToRideOffer.execute(input)).toEqual(expired);
    expect(await app.respondToRideOffer.execute({ ...input, commandKey: 'other' })).toEqual(
      expired,
    );
    expect(
      (await app.events()).filter(({ event }) => event.type === 'RideOfferExpired'),
    ).toHaveLength(1);
    const trip = unwrap(
      await app.unitOfWork.run(async ({ trips }) => ok(await trips.get(booking.bookingId))),
    );
    expect(trip).toBeUndefined();
  },
);

async function configureFallback({ stands, drivers, towns }: Transaction) {
  const neighbour = { ...DEMO_STAND, standId: OTHER_STAND };
  const outOfRun = {
    ...DEMO_STAND,
    demoRunId: unwrap(createDemoRunId(uuid(43))),
    standId: unwrap(createStandId(uuid(44))),
  };
  unwrap(await stands.save(neighbour, null));
  unwrap(await stands.save(outOfRun, null));
  unwrap(
    await stands.save({ ...DEMO_STAND, neighbourStandIds: [outOfRun.standId, OTHER_STAND] }, 1),
  );
  const offline = { driverId: DRIVER_ONE, standId: STAND, availability: 'offline' as const };
  const online = {
    driverId: DRIVER_TWO,
    standId: OTHER_STAND,
    availability: 'online' as const,
    queuedAt: 1n,
  };
  unwrap(await drivers.save({ ...SCOPE, entry: offline }, 1));
  unwrap(await drivers.save({ ...SCOPE, entry: online }, 1));
  return towns.save(
    {
      ...DEMO_TOWN,
      maxSearchStands: 2,
      dispatchDuration: duration(HOUR_MS),
      offerTimeout: duration(MINUTE_MS / 2),
    },
    1,
  );
}

test('fallback uses the captured neighbour and a configured offer timeout', async () => {
  const app = await createDemo();
  await write(app, configureFallback);
  const { bookingId } = await requestRide(app);
  expect(unwrap(await app.advanceDispatch.execute({ bookingId })).status).toBe('offering');
  expect(
    unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_TWO }))
      ?.expiresAtEpochMilliseconds,
  ).toBe(NOW_MS + MINUTE_MS / 2);
  expect((await app.events()).at(-1)?.event).toMatchObject({
    standId: OTHER_STAND,
    eligibleDriverIds: [DRIVER_TWO],
  });
});
