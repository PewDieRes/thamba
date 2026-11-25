import { describe, expect, test } from 'vitest';
import type {
  CoordinatorDashboardReader,
  DashboardScope,
} from '@application/ports/coordinator-dashboard-reader';
import type { DemoComplaintWriter } from '@application/ports/demo-complaint-writer';
import type { RecordedEvent } from '@application/ports/event-log';
import type { EventId } from '@domain/shared/ids.value-object';
import {
  createComplaintId,
  createDemoRunId,
  createRiderId,
  createStandId,
} from '@domain/shared/ids.value-object';
import {
  COORDINATOR,
  DEMO_STAND,
  DRIVER_ONE,
  DRIVER_TWO,
  HOUR_MS,
  NOW,
  NOW_MS,
  RIDER,
  SCOPE,
  STAND,
  SUBJECT_ONE,
  SUBJECT_TWO,
  TOWN,
  uuid,
} from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { BOOKING_ID } from './contract-data.fixtures';

const EXPIRES_AT_MILLISECONDS = Date.UTC(2099, 0, 1);
export const OTHER_OPERATIONS_RUN = unwrap(createDemoRunId(uuid(171)));
export const OTHER_OPERATIONS_STAND = unwrap(createStandId(uuid(172)));
const otherScope = { townId: TOWN, demoRunId: OTHER_OPERATIONS_RUN };
export const operationsMembership = { ...SCOPE, coordinatorId: COORDINATOR, standId: STAND };
export const otherRider = unwrap(createRiderId(SUBJECT_TWO));
export const operationsRuns = [
  { ...SCOPE, riderId: RIDER, expiresAtEpochMilliseconds: EXPIRES_AT_MILLISECONDS },
  { ...otherScope, riderId: otherRider, expiresAtEpochMilliseconds: EXPIRES_AT_MILLISECONDS },
];
export const operationsStands = [
  { ...DEMO_STAND, name: 'Operations Stand' },
  { ...DEMO_STAND, ...otherScope, name: 'Other Stand', standId: OTHER_OPERATIONS_STAND },
];
export const operationsDrivers = [
  {
    ...SCOPE,
    demoDriver: { name: 'Driver One', names: {}, vehicleNumber: 'DEMO 01' },
    entry: { driverId: DRIVER_ONE, standId: STAND, availability: 'offline' },
  },
  {
    ...otherScope,
    demoDriver: { name: 'Driver Two', names: {}, vehicleNumber: 'DEMO 02' },
    entry: {
      driverId: DRIVER_TWO,
      standId: OTHER_OPERATIONS_STAND,
      availability: 'online',
      queuedAt: 2n,
    },
  },
] as const;

export const operationsEvent: RecordedEvent = {
  eventId: uuid(173) as EventId,
  event: {
    ...SCOPE,
    type: 'DriverQueueChanged',
    actor: { type: 'stand_coordinator', coordinatorId: COORDINATOR, standId: STAND },
    driverId: DRIVER_ONE,
    standId: STAND,
    occurredAt: NOW,
    reason: 'break',
    before: { driverId: DRIVER_ONE, standId: STAND, availability: 'online', queuedAt: 1n },
    after: operationsDrivers[0].entry,
  },
};

const request: DashboardScope = {
  membership: operationsMembership,
  subject: SUBJECT_ONE,
  dayStart: NOW_MS - HOUR_MS,
  dayEnd: NOW_MS + HOUR_MS,
};

interface OperationsAdapters {
  dashboard: CoordinatorDashboardReader;
  complaints: DemoComplaintWriter;
}

export function coordinatorOperationsContract(prepare: () => Promise<OperationsAdapters>) {
  describe('Coordinator dashboard and Demo complaints', () => {
    dashboardReaderContract(prepare);
    complaintWriterContract(prepare);
  });
}

function dashboardReaderContract(prepare: () => Promise<OperationsAdapters>) {
  test('returns only the authorized Stand roster, bookings and queue changes', async () => {
    const { dashboard } = await prepare();
    const result = unwrap(await dashboard.read(request));
    expect(result.stand).toMatchObject({ id: STAND, name: 'Operations Stand' });
    expect(result.drivers).toMatchObject([
      {
        driverId: DRIVER_ONE,
        vehicleNumber: 'DEMO 01',
        availability: 'offline',
        hasDevice: false,
      },
    ]);
    expect(result.bookings).toMatchObject([{ bookingId: BOOKING_ID, fareInPaise: 7000 }]);
    expect(Object.keys(result.bookings[0] ?? {}).sort()).toEqual([
      'bookingId',
      'fareInPaise',
      'pickupAt',
      'status',
    ]);
    expect(result.changes).toMatchObject([{ driverId: DRIVER_ONE, before: '1', reason: 'break' }]);
    await expect(dashboard.read({ ...request, subject: SUBJECT_TWO })).resolves.toMatchObject({
      ok: false,
    });
    await expect(
      dashboard.read({
        ...request,
        membership: { ...operationsMembership, ...otherScope, standId: OTHER_OPERATIONS_STAND },
      }),
    ).resolves.toMatchObject({ ok: false });
  });
}

function complaintWriterContract(prepare: () => Promise<OperationsAdapters>) {
  test('allows a complaint ID independently in each run and rejects cross-run writes', async () => {
    const { complaints } = await prepare();
    const first = {
      ...SCOPE,
      riderId: RIDER,
      complaintId: unwrap(createComplaintId(uuid(174))),
      topic: 'fare',
      now: NOW,
    } as const;
    const second = { ...first, ...otherScope, riderId: otherRider, topic: 'wait' } as const;
    const results = await Promise.all([complaints.save(first), complaints.save(second)]);
    expect(results).toEqual([
      { ok: true, value: undefined },
      { ok: true, value: undefined },
    ]);
    await expect(complaints.save(first)).resolves.toMatchObject({ ok: true });
    await expect(complaints.save({ ...first, topic: 'trip' })).resolves.toEqual({
      ok: false,
      error: { code: 'idempotency_key_reused' },
    });
    await expect(complaints.save({ ...second, riderId: RIDER })).resolves.toEqual({
      ok: false,
      error: { code: 'forbidden' },
    });
  });
}
