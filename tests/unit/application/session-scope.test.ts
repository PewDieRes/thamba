import { expect, test } from 'vitest';
import {
  createDemoRunId,
  createSessionSubject,
  createStandId,
  createTownId,
} from '@domain/shared/ids.value-object';
import { Town } from '@domain/town/town';
import { ok } from '@domain/shared/result';
import {
  COORDINATOR,
  DEMO_STAND,
  DEMO_TOWN,
  DRIVER_THREE,
  FARE_CHART,
  MALVAN_TOWN,
  NEW_SUBJECT,
  NOW,
  RIDER,
  STAND,
  SUBJECT_ONE,
} from './demo-data.fixtures';
import {
  createDemo,
  type Demo,
  inviteInput,
  quoteInput,
  requestInput,
  requestRide,
  unwrap,
} from './demo.fixtures';
import type { Transaction } from '@application/ports/unit-of-work';
import type { Stand } from '@application/ports/stand-repository';
import type { SessionActor } from '@application/ports/actor-context';

function useSession() {
  let actor: SessionActor | undefined;
  return {
    context: {
      getActor: () => Promise.resolve(actor),
    },
    set: (next: SessionActor) => {
      actor = next;
    },
  };
}

test('Rider status comes from the verified session even when the caller supplies the owner ID', async () => {
  const session = useSession();
  const app = await createDemo({ actorContext: session.context });
  session.set({
    kind: 'anonymous',
    subject: unwrap(createSessionSubject(RIDER)),
    hasDriverDevice: false,
  });
  const { bookingId } = await requestRide(app);
  session.set({ kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: true });
  expect(await app.getBookingStatusForRider.execute({ riderId: RIDER, bookingId })).toEqual({
    ok: false,
    error: { code: 'not_found' },
  });
});

test('Coordinator membership must match the Town, run and Stand of the target Driver', async () => {
  const session = useSession();
  const app = await createDemo({ actorContext: session.context });
  session.set({
    kind: 'coordinator',
    subject: SUBJECT_ONE,
    memberships: [
      {
        coordinatorId: COORDINATOR,
        standId: STAND,
        townId: MALVAN_TOWN.town.townId,
      },
    ],
  });
  expect(await app.issueDriverInvite.execute(inviteInput)).toMatchObject({
    ok: false,
    error: { code: 'forbidden' },
  });
});

test('a bound Driver of one Town cannot respond to an assigned Ride offer in another Town', async () => {
  const session = useSession();
  const app = await createDemo({ actorContext: session.context });
  const { scope, standId } = await seedAnotherTown(app);
  session.set({
    kind: 'anonymous',
    subject: unwrap(createSessionSubject(RIDER)),
    hasDriverDevice: false,
  });
  const { quoteId } = unwrap(await app.quoteFare.execute({ ...quoteInput, ...scope }));
  const { bookingId } = unwrap(
    await app.requestRide.execute({ ...requestInput, quoteId, standId }),
  );
  session.set({ kind: 'sweep' });
  unwrap(await app.advanceDispatch.execute({ bookingId }));
  session.set({ kind: 'anonymous', subject: NEW_SUBJECT, hasDriverDevice: true });
  const offer = unwrap(await app.getPendingOfferForDriver.execute({}));
  if (!offer) throw new Error('Expected an offer in the second Town');
  const command = { offerId: offer.offerId, action: 'accept', commandKey: 'respond' };
  session.set({ kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: true });
  expect(await app.respondToRideOffer.execute({ ...command, subject: NEW_SUBJECT })).toEqual({
    ok: false,
    error: { code: 'not_found' },
  });
  session.set({ kind: 'anonymous', subject: NEW_SUBJECT, hasDriverDevice: true });
  expect(await app.respondToRideOffer.execute(command)).toMatchObject({
    ok: true,
    value: { status: 'accepted' },
  });
});

async function seedAnotherTown(app: Demo) {
  const townId = unwrap(createTownId('20000000-0000-4000-8000-000000000001'));
  const demoRunId = unwrap(createDemoRunId('20000000-0000-4000-8000-000000000002'));
  const standId = unwrap(createStandId('20000000-0000-4000-8000-000000000003'));
  const scope = { townId, demoRunId };
  unwrap(
    await app.unitOfWork.run(async (tx) => {
      const town = Town.create({ townId, simulationProfile: { kind: 'synthetic' } });
      unwrap(
        await tx.towns.save(
          {
            ...DEMO_TOWN,
            town,
            slug: 'another-demo-town',
            demoRuns: [{ demoRunId, riderId: RIDER }],
          },
          null,
        ),
      );
      unwrap(await tx.stands.save({ ...DEMO_STAND, ...scope, standId }, null));
      unwrap(await tx.fareCharts.save({ ...FARE_CHART, townId }, null));
      await seedDriverInAnotherTown(tx, { ...scope, standId });
      return ok(undefined);
    }),
  );
  return { scope, standId };
}

test('a third active Booking is rejected and cancelling frees a slot', async () => {
  const app = await createDemo();
  const quote = unwrap(await app.quoteFare.execute(quoteInput));
  const request = { ...requestInput, quoteId: quote.quoteId };
  const first = unwrap(await app.requestRide.execute(request));
  unwrap(await app.requestRide.execute({ ...request, commandKey: 'second' }));
  const third = { ...request, commandKey: 'third' };
  expect(await app.requestRide.execute(third)).toEqual({
    ok: false,
    error: { code: 'active_booking_limit' },
  });
  unwrap(
    await app.cancelBooking.execute({
      bookingId: first.bookingId,
      actor: { type: 'rider', riderId: RIDER },
      commandKey: 'cancel',
    }),
  );
  expect(await app.requestRide.execute(third)).toMatchObject({ ok: true });
});

async function seedDriverInAnotherTown(
  tx: Transaction,
  { standId, ...scope }: Pick<Stand, 'townId' | 'demoRunId' | 'standId'>,
) {
  unwrap(
    await tx.devices.save(
      { driverId: DRIVER_THREE, status: 'active', subject: NEW_SUBJECT, boundAt: NOW },
      null,
    ),
  );
  unwrap(
    await tx.drivers.save(
      {
        ...scope,
        entry: { standId, driverId: DRIVER_THREE, availability: 'online', queuedAt: 1n },
      },
      1,
    ),
  );
}
