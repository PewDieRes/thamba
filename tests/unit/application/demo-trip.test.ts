import type { SimulationSteps } from '@application/ports/driver-queue-repository';
import { expect, test } from 'vitest';
import { STAND, COORDINATOR, DRIVER_TWO } from './demo-data.fixtures';
import { ok } from '@domain/shared/result';
import { Instant } from '@domain/shared/instant.value-object';
import { createDemo, dispatchRide, DRIVER_ONE, NOW_MS, unwrap, type Demo } from './demo.fixtures';

const STEPS = { accept: 2, arrive: 3, start: 3, complete: 5 } as const;

test('dispatch advances only due steps for a scripted Demo Driver', async () => {
  const app = await createDemo();
  const { booking } = await dispatchRide(app);
  await configureScript(app, STEPS);

  const advanceAt = async (elapsedMilliseconds: number) => {
    app.clock.set(unwrap(Instant.fromEpochMilliseconds(NOW_MS + elapsedMilliseconds)));
    return unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId })).status;
  };

  expect(await advanceAt(1_999)).toBe('offering');
  expect(await advanceAt(2_000)).toBe('accepted');
  expect(await advanceAt(4_999)).toBe('accepted');
  expect(await advanceAt(5_000)).toBe('driver_arrived');
  expect(await advanceAt(8_000)).toBe('in_trip');
  expect(await advanceAt(13_000)).toBe('completed');
  expect(await advanceAt(15_000)).toBe('completed');

  expect(
    unwrap(
      await app.unitOfWork.run(async ({ trips }) =>
        ok((await trips.get(booking.bookingId))?.value.status),
      ),
    ),
  ).toBe('completed');
});

test('a scripted Driver cannot accept an expired Ride offer', async () => {
  const app = await createDemo();
  const { booking, offer } = await dispatchRide(app);
  await configureScript(app, STEPS);
  app.clock.set(unwrap(Instant.fromEpochMilliseconds(offer.expiresAtEpochMilliseconds)));
  const progress = unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId }));
  expect(progress.status).not.toBe('accepted');
  expect(
    unwrap(await app.unitOfWork.run(async ({ trips }) => ok(await trips.get(booking.bookingId)))),
  ).toBeUndefined();
});

test('a Demo Driver without a scripted acceptance keeps the offer pending', async () => {
  const app = await createDemo();
  const { booking } = await dispatchRide(app);
  await configureScript(app, { arrive: 3 });
  expect(unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId })).status).toBe(
    'offering',
  );
});

test('scripted queue exhaustion declines the Ride offer and ends an exhausted search', async () => {
  const app = await createDemo();
  unwrap(
    await app.setDriverAvailability.execute({
      actor: { type: 'stand_coordinator', standId: STAND, coordinatorId: COORDINATOR },
      driverId: DRIVER_TWO,
      isOnline: false,
      reason: 'break',
      commandKey: 'second-driver-break',
    }),
  );
  const { booking, offer } = await dispatchRide(app);
  await configureScript(app, { decline: 2 });
  app.clock.set(unwrap(Instant.fromEpochMilliseconds(NOW_MS + 1_999)));
  expect(unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId })).status).toBe(
    'offering',
  );
  app.clock.set(unwrap(Instant.fromEpochMilliseconds(NOW_MS + 2_000)));
  expect(unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId })).status).toBe(
    'requested',
  );
  expect(unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId })).status).toBe(
    'no_driver_found',
  );
  const recorded = unwrap(
    await app.unitOfWork.run(async ({ offers }) => ok(await offers.get(offer.offerId))),
  );
  expect(recorded?.value.status).toBe('declined');
  const changes = (await app.events()).flatMap(({ event }) =>
    event.type === 'DriverQueueChanged' && event.driverId === DRIVER_TWO ? [event.reason] : [],
  );
  expect(changes).toEqual(['break']);
});

async function configureScript(app: Demo, simulationSteps: SimulationSteps) {
  unwrap(
    await app.unitOfWork.run(async ({ drivers }) => {
      const driver = await drivers.get(DRIVER_ONE);
      if (!driver) throw new Error('Missing test Driver');
      return drivers.save({ ...driver.value, simulationSteps }, driver.version);
    }),
  );
}
