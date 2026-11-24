import { expect, test } from 'vitest';
import { createBookingId } from '@domain/shared/ids.value-object';
import { Town } from '@domain/town/town';
import { duration } from '../domain/dispatch/booking.fixtures';
import {
  DEMO_STAND,
  DEMO_TOWN,
  FARE_CHART,
  HOUR_MS,
  NOW_MS,
  RIDER,
  SUBJECT_ONE,
  SUBJECT_TWO,
  TOWN,
  uuid,
} from './demo-data.fixtures';
import {
  acceptRide,
  createDemo,
  dispatchRide,
  driverCommand,
  quoteInput,
  requestInput,
  requestRide,
  unwrap,
} from './demo.fixtures';

const MINUTE_MS = 60_000;
const UNKNOWN_BOOKING = unwrap(createBookingId(uuid(70)));

test('a pending offer disappears from the Driver inbox when its Stand no longer serves the pickup', async () => {
  const app = await createDemo();
  await dispatchRide(app);
  unwrap(
    await app.unitOfWork.run(({ stands }) => stands.save({ ...DEMO_STAND, pickupCues: {} }, 1)),
  );
  expect(
    unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_ONE })),
  ).toBeUndefined();
});

test('a second Booking selects another Driver while the first has an active Trip', async () => {
  const app = await createDemo();
  await acceptRide(app);
  const { quoteId } = unwrap(await app.quoteFare.execute(quoteInput));
  const { bookingId } = unwrap(
    await app.requestRide.execute({ ...requestInput, quoteId, commandKey: 'request another' }),
  );
  expect(unwrap(await app.advanceDispatch.execute({ bookingId })).status).toBe('offering');
  expect(
    unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_TWO })),
  ).toBeDefined();
  expect(await app.advanceDispatch.execute({ bookingId: UNKNOWN_BOOKING })).toMatchObject({
    ok: false,
    error: { code: 'not_found' },
  });
});

test('the Rider can cancel a request before any offer or Trip exists', async () => {
  const app = await createDemo();
  const { bookingId } = await requestRide(app);
  const input = { actor: { type: 'rider', riderId: RIDER }, commandKey: 'cancel' };
  expect(await app.cancelBooking.execute({ ...input, bookingId: UNKNOWN_BOOKING })).toMatchObject({
    ok: false,
    error: { code: 'not_found' },
  });
  expect(unwrap(await app.cancelBooking.execute({ ...input, bookingId })).status).toBe(
    'cancelled_by_rider',
  );
});

test('acceptance before expiry closes the offer when Town authority is lost', async () => {
  const app = await createDemo();
  const { offer, booking } = await dispatchRide(app);
  unwrap(
    await app.unitOfWork.run(({ towns }) =>
      towns.save({ ...DEMO_TOWN, town: Town.create({ townId: TOWN }) }, 1),
    ),
  );
  const accept = { ...driverCommand, offerId: offer.offerId, action: 'accept' };
  expect(await app.respondToRideOffer.execute(accept)).toMatchObject({
    ok: false,
    error: { code: 'booking_unavailable' },
  });
  expect(
    unwrap(
      await app.getBookingStatusForRider.execute({ bookingId: booking.bookingId, riderId: RIDER }),
    ).status,
  ).toBe('no_driver_found');
});

test('activation without the captured pickup still closes at the end of the Stand search', async () => {
  const app = await createDemo();
  unwrap(
    await app.unitOfWork.run(({ towns }) =>
      towns.save(
        {
          ...DEMO_TOWN,
          dispatchDuration: duration(MINUTE_MS),
          scheduleLeadTime: duration(HOUR_MS),
        },
        1,
      ),
    ),
  );
  const { quoteId } = unwrap(
    await app.quoteFare.execute({ ...quoteInput, pickupAtEpochMilliseconds: NOW_MS + HOUR_MS }),
  );
  const { bookingId } = unwrap(await app.scheduleRide.execute({ ...requestInput, quoteId }));
  unwrap(
    await app.unitOfWork.run(({ stands }) => stands.save({ ...DEMO_STAND, pickupCues: {} }, 1)),
  );
  expect(unwrap(await app.advanceDispatch.execute({ bookingId }))).toMatchObject({
    noDriverFoundReason: 'stands_exhausted',
  });
});

test('an expired quote whose Route was withdrawn returns the current fare error', async () => {
  const app = await createDemo();
  const { quoteId } = unwrap(await app.quoteFare.execute(quoteInput));
  unwrap(
    await app.unitOfWork.run(({ fareCharts }) =>
      fareCharts.save({ ...FARE_CHART, version: 2, routes: [] }, 1),
    ),
  );
  expect(await app.requestRide.execute({ ...requestInput, quoteId })).toMatchObject({
    ok: false,
    error: { code: 'NO_ROUTE' },
  });
});
