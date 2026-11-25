import { expect, test, vi } from 'vitest';
import {
  DEMO_STAND,
  DEMO_TOWN,
  DESTINATION,
  DRIVER_TWO,
  NEW_SUBJECT,
  RIDER,
  SUBJECT_TWO,
} from '../../demo-data.fixtures';
import {
  acceptRide,
  createDemo,
  dispatchRide,
  driverCommand,
  startTrip,
  unwrap,
} from '../../demo.fixtures';

test('shows position and keeps a pending offer out of the Trip projection', async () => {
  const app = await createDemo();
  await dispatchRide(app);
  expect(
    unwrap(await app.getDriverState.execute({ subject: driverCommand.subject })),
  ).toMatchObject({
    availability: 'online',
    queuePosition: 1,
    trip: null,
  });
  expect(unwrap(await app.getDriverState.execute({ subject: SUBJECT_TWO }))).toMatchObject({
    driverId: DRIVER_TWO,
    queuePosition: 2,
    trip: null,
  });
});

test('shows the matched Trip and retains the rejoin prompt until the Driver rejoins', async () => {
  const app = await createDemo();
  const input = await startTrip(app);
  expect(unwrap(await app.getDriverState.execute({ subject: input.subject }))).toMatchObject({
    availability: 'offline',
    trip: { bookingId: input.bookingId, status: 'in_trip', fareInPaise: 7000 },
  });
  expect(unwrap(await app.getDriverState.execute({ subject: SUBJECT_TWO })).trip).toBeNull();

  unwrap(await app.completeTrip.execute({ ...input, commandKey: 'complete' }));
  expect(unwrap(await app.getDriverState.execute({ subject: input.subject }))).toMatchObject({
    trip: null,
    needsRejoin: true,
  });
  unwrap(await app.rejoinQueue.execute({ subject: input.subject, commandKey: 'rejoin' }));
  expect(unwrap(await app.getDriverState.execute({ subject: input.subject }))).toMatchObject({
    availability: 'online',
    needsRejoin: false,
    queuePosition: 2,
  });
});

test('returns the active contact for the matched Driver and clears it when the Rider cancels', async () => {
  const contact = { firstName: 'Demo', phone: '+916000000001' };
  const get = vi.fn(() => Promise.resolve({ ok: true as const, value: contact }));
  const app = await createDemo({ matchedRiderContacts: { get } });
  const { booking } = await acceptRide(app);
  const input = { subject: driverCommand.subject };
  expect(unwrap(await app.getDriverState.execute({ subject: SUBJECT_TWO })).trip).toBeNull();
  expect(get).not.toHaveBeenCalled();
  expect(unwrap(await app.getDriverState.execute(input)).trip?.rider).toEqual(contact);
  expect(get).toHaveBeenCalledExactlyOnceWith({ ...input, bookingId: booking.bookingId });
  unwrap(
    await app.cancelBooking.execute({
      actor: { type: 'rider', riderId: RIDER },
      bookingId: booking.bookingId,
      commandKey: 'cancel',
    }),
  );
  expect(unwrap(await app.getDriverState.execute(input))).toMatchObject({
    trip: null,
    availability: 'offline',
    needsRejoin: false,
  });
  expect(get).toHaveBeenCalledTimes(1);
});

test('refuses state when the advertised Driver session has no active binding', async () => {
  const app = await createDemo();
  expect(await app.getDriverState.execute({ subject: NEW_SUBJECT })).toEqual({
    ok: false,
    error: { code: 'not_found' },
  });
});

test('returns a typed failure if the active contact store is unavailable', async () => {
  const unavailable = { ok: false, error: { code: 'storage_unavailable' } } as const;
  const app = await createDemo({
    matchedRiderContacts: { get: () => Promise.resolve(unavailable) },
  });
  await acceptRide(app);
  expect(await app.getDriverState.execute({ subject: driverCommand.subject })).toEqual(unavailable);
});

test('returns a named Stand and a localized destination for an accepted Trip', async () => {
  const app = await createDemo();
  const destination = {
    id: DESTINATION,
    slug: 'garden',
    name: 'Garden',
    names: { mr: 'बाग' },
    isIllustrative: false,
  };
  unwrap(
    await app.unitOfWork.run(async ({ stands, towns }) => {
      const stand = await stands.save(
        { ...DEMO_STAND, name: 'River Stand', names: { mr: 'नदी स्टँड' } },
        1,
      );
      if (!stand.ok) return stand;
      return towns.save({ ...DEMO_TOWN, landmarks: [destination] }, 1);
    }),
  );
  await acceptRide(app);
  expect(
    unwrap(await app.getDriverState.execute({ subject: driverCommand.subject })),
  ).toMatchObject({
    stand: { name: 'River Stand', names: { mr: 'नदी स्टँड' } },
    trip: { destination: { name: 'Garden', names: { mr: 'बाग' } } },
  });
});
