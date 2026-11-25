import { expect, test } from 'vitest';
import { GetCoordinatorDashboard } from '@application/use-cases/get-coordinator-dashboard/get-coordinator-dashboard.use-case';
import { createGetCoordinatorDashboardSchema } from '@application/use-cases/get-coordinator-dashboard/get-coordinator-dashboard.input';
import type { Transaction } from '@application/ports/unit-of-work';
import type { DashboardSnapshot } from '@application/ports/coordinator-dashboard-reader';
import { ok } from '@domain/shared/result';
import { Town } from '@domain/town/town';
import { zodInputSchema } from '@infrastructure/composition/zod-input-schema';
import { createDemo, inviteInput, unwrap } from '../../demo.fixtures';
import {
  DEMO_TOWN,
  NEW_SUBJECT,
  NOW,
  SCOPE,
  STAND,
  SUBJECT_ONE,
  uuid,
} from '../../demo-data.fixtures';
import { DEADLINE, OFFER, TRIP } from '../../../../contract/contract-data.fixtures';
import { createDriverId, type DriverId } from '@domain/shared/ids.value-object';
import { RideOffer } from '@domain/dispatch/ride-offer';

type InviteScope = DashboardSnapshot['inviteScope'];
type InviteFacts = DashboardSnapshot['drivers'][number]['inviteFacts'];

const { coordinatorId } = inviteInput;
const actors = {
  getActor: () =>
    Promise.resolve({
      kind: 'coordinator' as const,
      subject: SUBJECT_ONE,
      memberships: [{ ...SCOPE, standId: STAND, coordinatorId }],
    }),
};
const keys = [
  'isSimulated',
  'hasSimulationProfile',
  'isInDemoRun',
  'isSynthetic',
  'hasSlot',
  'hasDevice',
  'hasPendingOffer',
  'hasActiveTrip',
] as const;
const combinations = keys.reduce<Partial<Record<(typeof keys)[number], boolean>>[]>(
  (rows, key) =>
    rows.flatMap((row) => [
      { ...row, [key]: false },
      { ...row, [key]: true },
    ]),
  [{}],
);

test('the command and dashboard agree for every invitation fact combination', async () => {
  for (const flags of combinations) await checkAgreement(flags);
});

async function checkAgreement(flags: (typeof combinations)[number]) {
  const inviteScope = {
    bookingMode: flags.isSimulated ? 'simulated' : 'live',
    hasSimulationProfile: Boolean(flags.hasSimulationProfile),
    isInDemoRun: Boolean(flags.isInDemoRun),
  } as const;
  const inviteFacts = {
    isSynthetic: Boolean(flags.isSynthetic),
    hasSlot: Boolean(flags.hasSlot),
    hasDevice: Boolean(flags.hasDevice),
    hasPendingOffer: Boolean(flags.hasPendingOffer),
    hasActiveTrip: Boolean(flags.hasActiveTrip),
  };
  const input = {
    ...inviteInput,
    driverId: inviteFacts.hasSlot ? inviteInput.driverId : NEW_DRIVER,
  };
  const snapshot = createSnapshot(input.driverId, inviteScope, inviteFacts);
  const dashboard = new GetCoordinatorDashboard(
    { actors, reader: { read: () => Promise.resolve(ok(snapshot)) }, clock: { now: () => NOW } },
    createGetCoordinatorDashboardSchema(zodInputSchema),
  );
  const app = await createDemo({ actorContext: actors });
  unwrap(
    await app.unitOfWork.run(async (tx) => {
      await seedInviteScope(tx, inviteScope);
      await seedInviteFacts(tx, input.driverId, inviteFacts);
      return ok(undefined);
    }),
  );
  const shown = unwrap(await dashboard.execute({ standId: STAND })).dashboard.drivers[0];
  expect(shown?.canInvite, JSON.stringify(flags)).toBe(
    (await app.issueDriverInvite.execute(input)).ok,
  );
}

function createSnapshot(
  driverId: DriverId,
  inviteScope: InviteScope,
  inviteFacts: InviteFacts,
): DashboardSnapshot {
  return {
    stand: { id: STAND, name: 'Demo Stand', names: {} },
    inviteScope,
    drivers: [
      {
        driverId,
        name: 'Driver',
        names: {},
        vehicleNumber: null,
        queuedAt: null,
        availability: 'offline',
        tripsToday: 0,
        inviteFacts,
      },
    ],
    bookings: [],
    changes: [],
  };
}

async function seedInviteScope(tx: Transaction, scope: InviteScope) {
  const town = Town.restore(
    {
      townId: SCOPE.townId,
      simulationProfile: scope.hasSimulationProfile ? { kind: 'synthetic' } : undefined,
    },
    scope.bookingMode ?? 'live',
  );
  const current = await tx.towns.get(SCOPE.townId);
  unwrap(
    await tx.towns.save(
      { ...DEMO_TOWN, town, demoRuns: scope.isInDemoRun ? DEMO_TOWN.demoRuns : [] },
      current?.version ?? null,
    ),
  );
}

async function seedInviteFacts(tx: Transaction, driverId: DriverId, facts: InviteFacts) {
  if (facts.hasSlot) {
    const queue = await tx.drivers.get(driverId);
    if (!queue) throw new Error('Missing Driver fixture');
    unwrap(
      await tx.drivers.save({ ...queue.value, isSynthetic: facts.isSynthetic }, queue.version),
    );
  }
  if (facts.hasDevice) {
    const device = { driverId, subject: NEW_SUBJECT, status: 'active', boundAt: NOW } as const;
    unwrap(await tx.devices.save(device, null));
  }
  if (facts.hasPendingOffer) {
    const offer = unwrap(
      RideOffer.issue({
        bookingId: OFFER.bookingId,
        offerId: OFFER.offerId,
        standId: OFFER.standId,
        driverId,
        now: NOW,
        dispatchDeadline: DEADLINE,
      }),
    );
    unwrap(await tx.offers.save({ ...SCOPE, offer, status: 'pending' }, null));
  }
  if (facts.hasActiveTrip) unwrap(await tx.trips.save({ ...TRIP, driverId }, null));
}

// The command's roster lookup cannot return a Driver without a slot.
const NEW_DRIVER = unwrap(createDriverId(uuid(175)));
