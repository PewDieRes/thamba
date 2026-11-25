import type { Booking } from '@domain/dispatch/booking';
import { getDispatchBlock } from '@domain/dispatch/booking-request';
import { isRideOfferExpired, type RideOffer } from '@domain/dispatch/ride-offer';
import type { DriverSession } from '@domain/identity/driver-device';
import {
  createSessionSubject,
  type DriverId,
  type RideOfferId,
} from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { ActiveTrip } from '@domain/trip/trip';
import type { ScopedQueueEntry } from '../ports/driver-queue-repository';
import type { TownRecord } from '../ports/town-repository';
import type { IdGenerator } from '../ports/id-generator';
import type { Transaction } from '../ports/unit-of-work';
import type { Versioned } from '../ports/versioned';
import { canBookTown, sameScope } from './booking-authority';
import { mapBookingProgress } from './booking.mapper';
import { commit } from './execute-command';
import { saveBookingDecision } from './save-booking-decision';
import { saveOfferResolution } from './save-offer-resolution';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';

const MILLISECONDS_PER_SECOND = 1_000;

interface SimulationContext {
  now: Instant;
  ids: IdGenerator;
  town: TownRecord | undefined;
  declinePenalty: DeclinePenaltyPolicy;
}

export async function advanceDemoDriver(
  tx: Transaction,
  current: Versioned<Booking>,
  context: SimulationContext,
) {
  const { state } = current.value;
  if (!state.demoRunId) return undefined;
  const queue = await getScriptedDriver(tx.drivers, state);
  if (!queue) return undefined;
  const driver = createSimulationSession(queue.entry.driverId, context.now);
  if (!driver) return undefined;

  return state.trip
    ? advanceDemoTrip(tx, current, { ...context, driver, queue, trip: state.trip })
    : respondToDemoOffer(tx, current, { ...context, driver, queue });
}

type ScriptedDriver = ScopedQueueEntry & Required<Pick<ScopedQueueEntry, 'simulationSteps'>>;

async function getScriptedDriver(
  drivers: Transaction['drivers'],
  state: Booking['state'],
): Promise<ScriptedDriver | undefined> {
  const driverId = state.offer?.driverId ?? state.trip?.driverId;
  if (!driverId) return undefined;
  const queue = (await drivers.get(driverId))?.value;
  if (!queue?.simulationSteps || !sameScope(queue, state)) return undefined;
  return { ...queue, simulationSteps: queue.simulationSteps };
}

function createSimulationSession(driverId: DriverId, now: Instant): DriverSession | undefined {
  const subject = createSessionSubject(driverId);
  if (!subject.ok) return undefined;
  // An isolated scripted Driver uses an in-process identity and never acquires an Auth session.
  return {
    subject: subject.value,
    device: { subject: subject.value, driverId, boundAt: now, status: 'active' },
  };
}

async function respondToDemoOffer(
  tx: Transaction,
  current: Versioned<Booking>,
  context: SimulationContext & { driver: DriverSession; queue: ScriptedDriver },
) {
  const { state } = current.value;
  const offer = await getPendingOffer(tx.offers, state.offer?.offerId);
  if (!offer) return undefined;
  const { now, town, queue, driver } = context;
  const canBook = canBookTown(town, state, now);
  if (getDispatchBlock(state, { canBook }, now) || isRideOfferExpired(offer, now)) return undefined;
  const { decline, accept } = queue.simulationSteps;
  const decision = isDue(offer.issuedAt, decline, now)
    ? current.value.closeOffer(
        {
          action: 'decline',
          canBook,
          offerId: offer.offerId,
          actor: { type: 'driver', driverId: driver.device.driverId },
        },
        now,
      )
    : await acceptDemoOffer(tx, current.value, { ...context, offer, accept, canBook });
  if (!decision) return undefined;
  if (!decision.ok) return decision;
  const saved = await saveOfferResolution(tx, {
    ...context,
    before: current,
    decision: decision.value,
  });
  return saved.ok ? commit(mapBookingProgress(decision.value.booking)) : saved;
}

type DemoAcceptance = SimulationContext & {
  driver: DriverSession;
  queue: ScriptedDriver;
  offer: RideOffer;
  accept: number | undefined;
  canBook: boolean;
};

async function acceptDemoOffer(tx: Transaction, booking: Booking, options: DemoAcceptance) {
  const { offer, driver, queue, accept, now, ids, canBook } = options;
  if (!isDue(offer.issuedAt, accept, now)) return undefined;
  if (await tx.trips.findActiveByDriver(driver.device.driverId)) return undefined;
  return booking.acceptOffer(
    { driver, offerId: offer.offerId, entry: queue.entry, canBook, tripId: ids.next<'Trip'>() },
    now,
  );
}

async function getPendingOffer(offers: Transaction['offers'], offerId: RideOfferId | undefined) {
  if (!offerId) return undefined;
  const pending = (await offers.get(offerId))?.value;
  return pending?.status === 'pending' ? pending.offer : undefined;
}

const tripSteps = {
  accepted: { step: 'arrive', timestamp: 'acceptedAt', command: 'reportArrival' },
  driver_arrived: { step: 'start', timestamp: 'arrivedAt', command: 'confirmPickup' },
  in_trip: { step: 'complete', timestamp: 'pickedUpAt', command: 'completeTrip' },
} as const;

async function advanceDemoTrip(
  tx: Transaction,
  current: Versioned<Booking>,
  {
    driver,
    trip,
    queue,
    now,
    ids,
  }: SimulationContext & {
    driver: DriverSession;
    trip: ActiveTrip;
    queue: ScriptedDriver;
  },
) {
  const { step, timestamp, command } = tripSteps[trip.status];
  if (!isDue(trip[timestamp], queue.simulationSteps[step], now)) return undefined;
  const decision = current.value[command](driver, now);
  if (!decision.ok) return decision;
  const saved = await saveBookingDecision(tx, decision.value, {
    ids,
    expectedVersion: current.version,
  });
  return saved.ok ? commit(mapBookingProgress(decision.value.booking)) : saved;
}

function isDue(previous: Instant | undefined, delaySeconds: number | undefined, now: Instant) {
  return (
    previous !== undefined &&
    delaySeconds !== undefined &&
    now.epochMilliseconds - previous.epochMilliseconds >= delaySeconds * MILLISECONDS_PER_SECOND
  );
}
