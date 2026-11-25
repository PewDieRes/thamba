import type { DemoRunProvisioning } from '@application/ports/demo-run-provisioner';
import type { SimulationSteps } from '@application/ports/driver-queue-repository';
import type { Stand } from '@application/ports/stand-repository';
import { getTailQueuedAt } from '@domain/dispatch/driver-queue-entry';
import type { DemoRunId, DriverId, RiderId, StandId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';

export type DemoScenario = 'successful_trip' | 'queue_exhaustion';

const DEMO_RUN_LIFETIME_MILLISECONDS = 86_400_000;
const OFFER_RESPONSE_DELAY_SECONDS = 2;
const ARRIVAL_DELAY_SECONDS = 3;
const PICKUP_DELAY_SECONDS = 3;
const COMPLETION_DELAY_SECONDS = 5;

const scripts: Record<DemoScenario, SimulationSteps> = {
  successful_trip: {
    accept: OFFER_RESPONSE_DELAY_SECONDS,
    arrive: ARRIVAL_DELAY_SECONDS,
    start: PICKUP_DELAY_SECONDS,
    complete: COMPLETION_DELAY_SECONDS,
  },
  queue_exhaustion: { decline: OFFER_RESPONSE_DELAY_SECONDS },
};

interface DemoRunSeed {
  readonly demoRunId: DemoRunId;
  readonly riderId: RiderId;
  readonly templateStand: Stand;
  readonly standId: StandId;
  readonly driverId: DriverId;
  readonly now: Instant;
}

export function buildDemoRun(
  scenario: DemoScenario,
  { demoRunId, riderId, templateStand, standId, driverId, now }: DemoRunSeed,
): DemoRunProvisioning {
  const scope = { townId: templateStand.townId, demoRunId };
  return {
    run: {
      ...scope,
      riderId,
      expiresAtEpochMilliseconds: now.epochMilliseconds + DEMO_RUN_LIFETIME_MILLISECONDS,
    },
    stand: { ...templateStand, ...scope, standId, neighbourStandIds: [] },
    drivers: [
      {
        ...scope,
        demoDriver: {
          name: 'Asha (demo)',
          names: { en: 'Asha (demo)', mr: 'आशा (डेमो)', hi: 'आशा (डेमो)' },
          vehicleNumber: 'DEMO 01',
        },
        entry: {
          driverId,
          standId,
          availability: 'online',
          queuedAt: getTailQueuedAt({ standId, entries: [], now }),
        },
        simulationSteps: { ...scripts[scenario] },
      },
    ],
  };
}
