import { createTestActorContext } from './test-actor-context.fixtures';
import type { WriteResult } from '@application/ports/application-result';
import type { Transaction } from '@application/ports/unit-of-work';
import { ok } from '@domain/shared/result';
import { FixedClock } from '@infrastructure/clock/fixed-clock';
import { createInMemoryContainer } from '@infrastructure/composition/container';
import { unwrap } from '../domain/dispatch/booking.fixtures';
import {
  DEMO_TOWN,
  MALVAN_TOWN,
  DEMO_STAND,
  FARE_CHART,
  QUEUE,
  SCOPE,
  NOW,
  DRIVER_ONE,
  DRIVER_TWO,
  DRIVER_THREE,
  SUBJECT_ONE,
  SUBJECT_TWO,
  PICKUP,
  DESTINATION,
  RIDER,
  STAND,
  COORDINATOR,
} from './demo-data.fixtures';

export { DRIVER_ONE, NOW_MS, HOUR_MS, NEW_SUBJECT, OTHER_SUBJECT } from './demo-data.fixtures';
export { unwrap };

export const quoteInput = {
  ...SCOPE,
  riderId: RIDER,
  pickupLandmarkId: PICKUP,
  destinationLandmarkId: DESTINATION,
  passengers: 1,
  commandKey: 'quote',
};
export const requestInput = { riderId: RIDER, standId: STAND, commandKey: 'request' };
export const driverCommand = { subject: SUBJECT_ONE, commandKey: 'driver-action' };
export const inviteInput = {
  coordinatorId: COORDINATOR,
  standId: STAND,
  driverId: DRIVER_THREE,
  commandKey: 'invite',
};

export async function createDemo(options: Parameters<typeof createInMemoryContainer>[0] = {}) {
  const clock = new FixedClock(NOW);
  const fixture = createTestActorContext();
  const app = createInMemoryContainer({ clock, ...fixture, ...options });
  if (!options.actorContext) fixture.wrap(app);
  unwrap(await app.unitOfWork.run(seedDemo));
  return {
    ...app,
    clock,
    events: async () =>
      unwrap(await app.unitOfWork.run(async ({ events }) => ok(await events.list()))),
  };
}

async function seedDemo(tx: Transaction) {
  const results: WriteResult[] = await Promise.all([
    tx.towns.save(DEMO_TOWN, null),
    tx.towns.save(MALVAN_TOWN, null),
    tx.stands.save(DEMO_STAND, null),
    tx.fareCharts.save(FARE_CHART, null),
    tx.devices.save(
      { driverId: DRIVER_ONE, subject: SUBJECT_ONE, boundAt: NOW, status: 'active' },
      null,
    ),
    tx.devices.save(
      { driverId: DRIVER_TWO, subject: SUBJECT_TWO, boundAt: NOW, status: 'active' },
      null,
    ),
    ...QUEUE.map((entry) => tx.drivers.save({ ...SCOPE, entry }, null)),
  ]);
  return results.find((result) => !result.ok) ?? ok(undefined);
}

export type Demo = Awaited<ReturnType<typeof createDemo>>;

export async function requestRide(app: Demo) {
  const quote = unwrap(await app.quoteFare.execute(quoteInput));
  return unwrap(await app.requestRide.execute({ ...requestInput, quoteId: quote.quoteId }));
}

export async function dispatchRide(app: Demo) {
  const requested = await requestRide(app);
  const booking = unwrap(await app.advanceDispatch.execute({ bookingId: requested.bookingId }));
  const offer = unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_ONE }));
  if (!offer) throw new Error('Expected a pending offer for the first Driver');
  return { booking, offer };
}

export async function acceptRide(app: Demo) {
  const { offer } = await dispatchRide(app);
  const booking = unwrap(
    await app.respondToRideOffer.execute({
      subject: SUBJECT_ONE,
      offerId: offer.offerId,
      action: 'accept',
      commandKey: 'accept',
    }),
  );
  return { booking, offer };
}

export async function startTrip(app: Demo) {
  const { booking } = await acceptRide(app);
  const input = { bookingId: booking.bookingId, subject: SUBJECT_ONE };
  unwrap(await app.markDriverArrived.execute({ ...input, commandKey: 'arrived' }));
  unwrap(await app.startTrip.execute({ ...input, commandKey: 'start' }));
  return input;
}
