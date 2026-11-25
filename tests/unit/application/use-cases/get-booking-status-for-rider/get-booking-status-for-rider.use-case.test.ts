import { err, ok } from '@domain/shared/result';
import type { RiderBookingRecord } from '@application/ports/rider-booking-reader';
import { createTownId } from '@domain/shared/ids.value-object';
import { expect, test, vi } from 'vitest';
import {
  createDemo,
  quoteInput,
  dispatchRide,
  requestRide,
  DRIVER_ONE,
  unwrap,
} from '../../demo.fixtures';

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

test('advances only the verified Rider booking after reading a snapshot', async () => {
  const execute = vi.fn(() => Promise.resolve(ok(undefined)));
  const app = await createDemo({ riderDispatchAdvancer: { execute } });
  const booking = await requestRide(app);
  await app.getBookingStatusForRider.execute({ bookingId: booking.bookingId, riderId: DRIVER_ONE });
  expect(execute).not.toHaveBeenCalled();

  const status = await app.getBookingStatusForRider.execute({
    bookingId: booking.bookingId,
    riderId: quoteInput.riderId,
  });
  expect(status).toMatchObject({ ok: true, value: { status: 'requested' } });
  expect(execute).toHaveBeenCalledExactlyOnceWith({ bookingId: booking.bookingId });
});

test('a Rider projection storage failure cannot trigger dispatch', async () => {
  const execute = vi.fn(() => Promise.resolve(ok(undefined)));
  const app = await createDemo({
    riderDispatchAdvancer: { execute },
    riderBookings: { get: () => Promise.resolve(err({ code: 'storage_unavailable' })) },
  });
  const booking = await requestRide(app);
  expect(
    await app.getBookingStatusForRider.execute({
      bookingId: booking.bookingId,
      riderId: quoteInput.riderId,
    }),
  ).toEqual(err({ code: 'storage_unavailable' }));
  expect(execute).not.toHaveBeenCalled();
});

test('omits private Rider contact from the Rider status payload', async () => {
  const riderPhone = '+919000000001';
  const projection: { record?: RiderBookingRecord } = {};
  const app = await createDemo({
    riderBookings: { get: () => Promise.resolve(ok(projection.record)) },
  });
  const { bookingId } = await requestRide(app);
  const saved = unwrap(
    await app.unitOfWork.run(async ({ bookings }) => ok(await bookings.get(bookingId))),
  );
  if (!saved) throw new Error('Missing saved Booking');
  const recordWithPrivateContact = { ...saved.value.state, riderPhone };
  projection.record = recordWithPrivateContact;

  const payload = unwrap(
    await app.getBookingStatusForRider.execute({ bookingId, riderId: quoteInput.riderId }),
  );
  expect(JSON.stringify(payload)).not.toContain(riderPhone);
});

test('keeps a saved Booking visible when its Town or Stand catalogue cannot be projected', async () => {
  const projection: { record?: RiderBookingRecord } = {};
  const app = await createDemo({
    riderBookings: { get: () => Promise.resolve(ok(projection.record)) },
  });
  const booking = await requestRide(app);
  const saved = unwrap(
    await app.unitOfWork.run(async ({ bookings }) => ok(await bookings.get(booking.bookingId))),
  );
  if (!saved) throw new Error('Missing saved Booking');
  projection.record = { ...saved.value.state, townId: unwrap(createTownId(DRIVER_ONE)) };
  expect(
    unwrap(
      await app.getBookingStatusForRider.execute({
        bookingId: booking.bookingId,
        riderId: quoteInput.riderId,
      }),
    ),
  ).toMatchObject({
    status: 'requested',
    capability: undefined,
    grievanceContact: undefined,
    standName: undefined,
  });
});
