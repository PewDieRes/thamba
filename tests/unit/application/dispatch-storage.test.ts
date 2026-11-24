import { expect, test } from 'vitest';
import { Instant } from '@domain/shared/instant.value-object';
import { ok } from '@domain/shared/result';
import { DEMO_STAND, DRIVER_ONE, HOUR_MS, NOW_MS, SCOPE, SUBJECT_ONE } from './demo-data.fixtures';
import {
  dispatchRide,
  quoteInput,
  requestInput,
  requestRide,
  unwrap,
  type Demo,
} from './demo.fixtures';
import { createFaultDemo, expectWriteRollbacks, replaceMethod } from './storage-failures.fixtures';
import { MINUTE_MS } from './dispatch-edge.fixtures';

async function createSchedule(app: Demo) {
  const { quoteId } = unwrap(
    await app.quoteFare.execute({ ...quoteInput, pickupAtEpochMilliseconds: NOW_MS + MINUTE_MS }),
  );
  return unwrap(await app.scheduleRide.execute({ ...requestInput, quoteId }));
}

test('activation and terminal decisions roll back when writes fail', async () => {
  const fixture = await createFaultDemo();
  const { app } = fixture;
  const { bookingId } = await createSchedule(app);
  const advance = () => app.advanceDispatch.execute({ bookingId });
  await expectWriteRollbacks(fixture, advance, ['bookings']);
  expect(unwrap(await advance()).status).toBe('offering');
  app.clock.set(unwrap(Instant.fromEpochMilliseconds(NOW_MS + HOUR_MS)));
  await expectWriteRollbacks(fixture, advance, ['offers']);
});

test('missing queue records and lost reservation writes do not allocate an offer', async () => {
  const { app, faults } = await createFaultDemo();
  const { bookingId } = await requestRide(app);
  faults.changePorts = (tx) => ({
    ...tx,
    drivers: replaceMethod(tx.drivers, 'get', () => Promise.resolve(undefined)),
  });
  expect(await app.advanceDispatch.execute({ bookingId })).toMatchObject({
    ok: false,
    error: { code: 'ConcurrencyConflict' },
  });
  faults.changePorts = (tx) => tx;
  expect((await app.events()).map(({ event }) => event.type)).toEqual(['BookingRequested']);
});

test('a missing Booking prevents an offline command from silently dropping its reservation', async () => {
  const { app, faults } = await createFaultDemo();
  await dispatchRide(app);
  faults.changePorts = (tx) => ({
    ...tx,
    bookings: replaceMethod(tx.bookings, 'get', () => Promise.resolve(undefined)),
  });
  const offline = {
    actor: { type: 'driver', subject: SUBJECT_ONE },
    driverId: DRIVER_ONE,
    isOnline: false,
    commandKey: 'offline',
  };
  expect(await app.setDriverAvailability.execute(offline)).toMatchObject({
    ok: false,
    error: { code: 'inconsistent_state' },
  });
  expect(
    unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_ONE })),
  ).toBeUndefined();
  faults.changePorts = (tx) => tx;
  expect(
    unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_ONE })),
  ).toBeDefined();
});

test('taking a Driver offline without an offer rolls back on a failed queue write', async () => {
  const fixture = await createFaultDemo();
  const offline = () =>
    fixture.app.setDriverAvailability.execute({
      actor: { type: 'driver', subject: SUBJECT_ONE },
      driverId: DRIVER_ONE,
      isOnline: false,
      commandKey: 'offline',
    });
  await expectWriteRollbacks(fixture, offline, ['drivers']);
  expect(unwrap(await offline()).availability).toBe('offline');
  expect(
    unwrap(
      await fixture.app.unitOfWork.run(async ({ drivers }) =>
        ok(await drivers.listForStands(SCOPE, [DEMO_STAND.standId])),
      ),
    ).find(({ value }) => value.entry.driverId === DRIVER_ONE)?.value.entry.availability,
  ).toBe('offline');
});
