import type { AuthSession } from '@application/ports/auth-session';
import { signInCoordinator } from './coordinator-email.fixtures';
import { expect, test } from 'vitest';
import {
  createAuthSession,
  createRiderBookingReader,
  createConfiguredContainer,
  createRequestRateLimit,
  sweepActorContext,
} from '@infrastructure/composition/container';
import type { RiderBookingReader } from '@application/ports/rider-booking-reader';
import { getScopedConfiguration } from './scoped-database.fixtures';
import type { ActorContext } from '@application/ports/actor-context';
import { createRiderId, createStandId } from '@domain/shared/ids.value-object';
import { randomUUID } from 'node:crypto';
import {
  DEMO_STAND,
  DRIVER_ONE,
  NOW,
  SUBJECT_ONE,
  TOWN,
  SCOPE,
  STAND,
} from '../unit/application/demo-data.fixtures';
import { inviteInput, quoteInput, requestInput, unwrap } from '../unit/application/demo.fixtures';
import { FixedClock } from '@infrastructure/clock/fixed-clock';
import { getLocalConfiguration, prepareContractDatabase } from './contract-database.fixtures';

function openSession() {
  getLocalConfiguration();
  const jar = new Map<string, string>();
  const session = createAuthSession({
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (updates) => {
      for (const update of updates) {
        if (update.options.maxAge === 0) jar.delete(update.name);
        else jar.set(update.name, update.value);
      }
    },
  });
  return { session, riderBookings: createRiderBookingReader(session) };
}

function createApp(actorContext: ActorContext, riderBookings?: RiderBookingReader) {
  return createConfiguredContainer(getScopedConfiguration(), {
    actorContext,
    ...(riderBookings ? { riderBookings } : {}),
    clock: new FixedClock(NOW),
  });
}

const inviteCommand = { ...inviteInput, locale: 'en', driverId: DRIVER_ONE };

export function registerSessionTests() {
  test(
    'binds a verified anonymous subject once and rejects its revoked device',
    verifyDriverBinding,
  );
  test('uses auth.uid() and Rider RLS with two real anonymous Auth sessions', verifyRiderIsolation);
  test('shares the Postgres request limit across independent server instances', async () => {
    const ip = randomUUID();
    const attempts = Array.from({ length: 12 }, () =>
      createRequestRateLimit().allow('booking', ip),
    );
    const results = await Promise.all(attempts);
    expect(results.map(unwrap).filter(Boolean)).toHaveLength(10);
  });
}

async function verifyDriverBinding() {
  const { transaction } = await prepareContractDatabase('invites');
  unwrap(
    await transaction.drivers.save(
      {
        ...SCOPE,
        entry: { driverId: DRIVER_ONE, standId: STAND, availability: 'offline' },
      },
      null,
    ),
  );
  const coordinator = await signInCoordinator(openSession().session);
  const app = createApp(coordinator);
  const { session: first } = openSession();
  const { session: second } = openSession();
  unwrap(await first.ensureAnonymous());
  unwrap(await second.ensureAnonymous());
  const { url } = unwrap(await app.issueDriverInvite.execute(inviteCommand));
  const input = { token: new URL(url, 'https://example.test').hash.slice(1), commandKey: 'bind' };
  const results = await Promise.all(
    [createApp(first), createApp(second)].map((driver) => driver.redeemDriverInvite.execute(input)),
  );
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  const winner = results[0]?.ok ? first : second;
  const other = results[0]?.ok ? second : first;
  expect(await winner.getActor()).toMatchObject({ kind: 'anonymous', hasDriverDevice: true });
  expect(await createApp(winner).redeemDriverInvite.execute(input)).toMatchObject({ ok: true });
  expect(await createApp(other).redeemDriverInvite.execute(input)).toMatchObject({
    ok: false,
    error: { code: 'INVITE_ALREADY_REDEEMED' },
  });
  await verifyRevocation(app, winner);
}

async function verifyRevocation(app: ReturnType<typeof createApp>, winner: AuthSession) {
  unwrap(
    await app.revokeDriverDevice.execute({
      ...inviteInput,
      driverId: DRIVER_ONE,
      commandKey: 'revoke',
    }),
  );
  expect(await winner.getActor()).toMatchObject({ kind: 'anonymous', hasDriverDevice: false });
  expect(await createApp(winner).getPendingOfferForDriver.execute({})).toMatchObject({
    ok: false,
    error: { code: 'forbidden' },
  });
}
async function verifyRiderIsolation() {
  const { app, visitor, visitorBookings, riderId, bookingId } = await bookAsAnonymousRider();
  expect(await visitorBookings.get(bookingId)).toEqual({ ok: true, value: undefined });
  expect(await createApp(sweepActorContext).sweepDispatch.execute({ batch: 'due' })).toMatchObject({
    ok: true,
    value: { failed: 0, attempted: 1 },
  });
  expect(await app.getBookingStatusForRider.execute({ bookingId })).toMatchObject({ ok: true });
  expect(
    await createApp(visitor, visitorBookings).getBookingStatusForRider.execute({
      riderId,
      bookingId,
    }),
  ).toEqual({
    ok: false,
    error: { code: 'not_found' },
  });
  expect(
    await createApp(visitor).getPendingOfferForDriver.execute({ subject: SUBJECT_ONE }),
  ).toMatchObject({
    ok: false,
    error: { code: 'forbidden' },
  });
}

async function bookAsAnonymousRider() {
  const { transaction } = await prepareContractDatabase('quotes');
  const { session: owner, riderBookings } = openSession();
  const { session: visitor, riderBookings: visitorBookings } = openSession();
  unwrap(await owner.ensureAnonymous());
  unwrap(await visitor.ensureAnonymous());
  const actor = await owner.getActor();
  if (actor?.kind !== 'anonymous') throw new Error('Expected anonymous test Rider');
  const riderId = unwrap(createRiderId(actor.subject));
  const templateStandId = unwrap(createStandId(randomUUID()));
  const { pickupCues, neighbourStandIds, coordinatorContact } = DEMO_STAND;
  unwrap(
    await transaction.stands.save(
      { townId: TOWN, standId: templateStandId, pickupCues, neighbourStandIds, coordinatorContact },
      null,
    ),
  );
  const app = createApp(owner, riderBookings);
  const { demoRunId, standId } = unwrap(
    await app.startDemoRun.execute({ townId: TOWN, standId: templateStandId }),
  );
  const { quoteId } = unwrap(await app.quoteFare.execute({ ...quoteInput, demoRunId }));
  const { bookingId } = unwrap(
    await app.requestRide.execute({ ...requestInput, quoteId, standId }),
  );
  return { app, visitor, visitorBookings, riderId, bookingId };
}
