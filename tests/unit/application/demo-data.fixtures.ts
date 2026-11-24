import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import type { FareChart } from '@domain/fares/fare-chart';
import {
  createDemoRunId,
  createDriverId,
  createLandmarkId,
  createRiderId,
  createRouteId,
  createSessionSubject,
  createStandCoordinatorId,
  createStandId,
  createTownId,
} from '@domain/shared/ids.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { Money } from '@domain/shared/money.value-object';
import { Town } from '@domain/town/town';
import type { Stand } from '@application/ports/stand-repository';
import type { TownRecord } from '@application/ports/town-repository';
import { unwrap } from '../domain/dispatch/booking.fixtures';

export const NOW_MS = Date.UTC(2026, 10, 24, 6);
export const HOUR_MS = 3_600_000;
export const NOW = unwrap(Instant.fromEpochMilliseconds(NOW_MS));
export const STAND_CONTACT = 'Synthetic Stand Coordinator contact';
export const GRIEVANCE_CONTACT = 'Synthetic grievance contact';

export function uuid(suffix: number): string {
  return `10000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
}

export const TOWN = unwrap(createTownId(uuid(1)));
export const MALVAN = unwrap(createTownId(uuid(2)));
export const DEMO_RUN = unwrap(createDemoRunId(uuid(3)));
export const STAND = unwrap(createStandId(uuid(4)));
export const PICKUP = unwrap(createLandmarkId(uuid(5)));
export const DESTINATION = unwrap(createLandmarkId(uuid(6)));
export const DRIVER_ONE = unwrap(createDriverId(uuid(7)));
export const DRIVER_TWO = unwrap(createDriverId(uuid(8)));
export const DRIVER_THREE = unwrap(createDriverId(uuid(9)));
export const SUBJECT_ONE = unwrap(createSessionSubject(uuid(10)));
export const SUBJECT_TWO = unwrap(createSessionSubject(uuid(11)));
export const NEW_SUBJECT = unwrap(createSessionSubject(uuid(12)));
export const OTHER_SUBJECT = unwrap(createSessionSubject(uuid(13)));
export const COORDINATOR = unwrap(createStandCoordinatorId(uuid(14)));
export const RIDER = unwrap(createRiderId(uuid(15)));
export const SCOPE = { townId: TOWN, demoRunId: DEMO_RUN };

export const DEMO_TOWN: TownRecord = {
  town: Town.create({ townId: TOWN, simulationProfile: { kind: 'synthetic' } }),
  slug: 'demo-town',
  name: 'Demo Town',
  demoRuns: [{ demoRunId: DEMO_RUN, riderId: RIDER }],
  grievanceContact: GRIEVANCE_CONTACT,
};

export const MALVAN_TOWN: TownRecord = {
  town: Town.create({ townId: MALVAN }),
  slug: 'malvan',
  name: 'Malvan',
  demoRuns: [],
  grievanceContact: GRIEVANCE_CONTACT,
};

export const DEMO_STAND: Stand = {
  ...SCOPE,
  standId: STAND,
  pickupCues: { [PICKUP]: 'Meet by the blue sign' },
  coordinatorContact: STAND_CONTACT,
  neighbourStandIds: [],
};

export const FARE_CHART: FareChart = {
  townId: TOWN,
  version: 1,
  nightWindow: { startMinuteOfDay: 1380, endMinuteOfDay: 360 },
  routes: [
    {
      route: {
        routeId: unwrap(createRouteId(uuid(16))),
        pickupLandmarkId: PICKUP,
        destinationLandmarkId: DESTINATION,
      },
      fare: unwrap(Money.fromPaise(7_000)),
      nightFare: unwrap(Money.fromPaise(9_000)),
    },
  ],
};

export const QUEUE: readonly DriverQueueEntry[] = [
  { availability: 'online', standId: STAND, driverId: DRIVER_ONE, queuedAt: 1n },
  { availability: 'online', standId: STAND, driverId: DRIVER_TWO, queuedAt: 2n },
  { availability: 'offline', standId: STAND, driverId: DRIVER_THREE },
];
