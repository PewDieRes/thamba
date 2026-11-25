import { expect, test, vi } from 'vitest';
import type { SessionActor } from '@application/ports/actor-context';
import type { CoordinatorDashboardReader } from '@application/ports/coordinator-dashboard-reader';
import { GetCoordinatorDashboard } from '@application/use-cases/get-coordinator-dashboard/get-coordinator-dashboard.use-case';
import { createGetCoordinatorDashboardSchema } from '@application/use-cases/get-coordinator-dashboard/get-coordinator-dashboard.input';
import { zodInputSchema } from '@infrastructure/composition/zod-input-schema';
import {
  COORDINATOR,
  DRIVER_ONE,
  NOW,
  SCOPE,
  STAND,
  SUBJECT_ONE,
  uuid,
} from '../../demo-data.fixtures';
import { BOOKING_ID, OTHER_BOOKING_ID } from '../../../../contract/contract-data.fixtures';

const membership = { ...SCOPE, standId: STAND, coordinatorId: COORDINATOR };
const coordinator = {
  kind: 'coordinator',
  memberships: [membership],
  subject: SUBJECT_ONE,
} as const;
const booking = {
  bookingId: BOOKING_ID,
  pickupAt: null,
  fareInPaise: 6000,
  status: 'offering',
} as const;

const driver = {
  driverId: DRIVER_ONE,
  name: 'Asha',
  names: {},
  queuedAt: '1',
  vehicleNumber: 'DEMO 01',
  availability: 'online',
  tripsToday: 0,
  inviteFacts: {
    isSynthetic: true,
    hasSlot: true,
    hasDevice: false,
    hasPendingOffer: false,
    hasActiveTrip: false,
  },
} as const;

function setup(actor: SessionActor | undefined = coordinator) {
  const read = vi.fn<CoordinatorDashboardReader['read']>();
  const useCase = new GetCoordinatorDashboard(
    {
      actors: { getActor: () => Promise.resolve(actor) },
      reader: { read },
      clock: { now: () => NOW },
    },
    createGetCoordinatorDashboardSchema(zodInputSchema),
  );
  return { useCase, read };
}

test('reads only the selected membership and returns queue positions, live bookings and rides', async () => {
  const { useCase, read } = setup();
  const logEntry = { ...booking, bookingId: OTHER_BOOKING_ID, status: 'completed' } as const;
  read.mockResolvedValue({
    ok: true,
    value: {
      stand: { id: STAND, name: 'Demo Stand', names: {} },
      bookings: [booking, logEntry],
      inviteScope: { bookingMode: 'simulated', hasSimulationProfile: true, isInDemoRun: true },
      drivers: [driver],
      changes: [],
    },
  });
  expect(await useCase.execute({ standId: STAND })).toMatchObject({
    ok: true,
    value: {
      standIds: [STAND],
      dashboard: {
        drivers: [{ driverId: DRIVER_ONE, position: 1, hasDevice: false, canInvite: true }],
        liveBookings: [booking],
        rides: [logEntry],
      },
    },
  });
  expect(read).toHaveBeenCalledWith({
    subject: SUBJECT_ONE,
    membership,
    dayStart: Date.UTC(2026, 10, 23, 18, 30),
    dayEnd: Date.UTC(2026, 10, 24, 18, 30),
  });
});

test('rejects invalid scopes and sessions before querying the dashboard', async () => {
  const { useCase, read } = setup();
  expect(await useCase.execute({ standId: uuid(181) })).toMatchObject({
    error: { code: 'forbidden' },
  });
  expect(await useCase.execute({ standId: ['invalid'] })).toMatchObject({
    error: { code: 'invalid_input' },
  });
  expect(read).not.toHaveBeenCalled();

  const deny = setup({ kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: false });
  expect(await deny.useCase.execute({})).toMatchObject({ error: { code: 'forbidden' } });
  expect(deny.read).not.toHaveBeenCalled();
});

test('requires a session and propagates a failed dashboard read', async () => {
  const absent = new GetCoordinatorDashboard(
    {
      actors: { getActor: () => Promise.resolve(undefined) },
      reader: { read: vi.fn() },
      clock: { now: () => NOW },
    },
    createGetCoordinatorDashboardSchema(zodInputSchema),
  );
  expect(await absent.execute({})).toMatchObject({ error: { code: 'unauthenticated' } });
  const { useCase, read } = setup();
  read.mockResolvedValue({ ok: false, error: { code: 'storage_unavailable' } });
  expect(await useCase.execute({})).toEqual({ ok: false, error: { code: 'storage_unavailable' } });
});
