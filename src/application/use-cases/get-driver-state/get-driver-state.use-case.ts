import type { DriverStateView } from '@application/contracts/driver-state-view';
import type { InputSchema } from '@application/contracts/input-schema';
import { mapDriverLandmark } from '@application/operations/driver-landmark.mapper';
import { getDriverSession } from '@application/operations/driver-session';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import type { ScopedQueueEntry } from '@application/ports/driver-queue-repository';
import type { MatchedRiderContactReader } from '@application/ports/matched-rider-contact-reader';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import type { DriverRankingPolicy } from '@domain/dispatch/driver-ranking.policy';
import type { SessionSubject } from '@domain/shared/ids.value-object';
import { err, ok } from '@domain/shared/result';
import { isActiveTrip } from '@domain/trip/trip';
import type { GetDriverStateInput } from './get-driver-state.input';

export class GetDriverState {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      unitOfWork: UnitOfWork;
      driverRanking: DriverRankingPolicy;
      matchedRiderContacts: MatchedRiderContactReader;
    },
    private readonly schema: InputSchema<GetDriverStateInput>,
  ) {}

  execute(input: unknown) {
    const { actorContext, unitOfWork } = this.ports;
    return validateActorInput(
      { actorContext, role: 'driver', schema: this.schema },
      input,
      ({ subject }) =>
        unitOfWork.run((tx) => this.readState(tx, subject), { target: { kind: 'device' } }),
    );
  }

  private async readState(tx: Transaction, subject: SessionSubject) {
    const session = await getDriverSession(tx.devices, subject);
    if (!session.ok) return session;
    const { driverId } = session.value;
    const queue = (await tx.drivers.get(driverId))?.value;
    if (!queue) return err({ code: 'not_found' as const });
    const { availability, standId } = queue.entry;
    const [stand, position, trip] = await Promise.all([
      tx.stands.get(standId),
      getQueuePosition(tx, queue, this.ports.driverRanking),
      this.readTrip(tx, { queue, subject }),
    ]);
    if (!trip.ok) return trip;
    return ok<DriverStateView>({
      driverId,
      stand: stand?.value.name ? { name: stand.value.name, names: stand.value.names } : null,
      availability,
      queuePosition: position,
      needsRejoin: queue.needsRejoin === true,
      trip: trip.value,
    });
  }

  private async readTrip(
    tx: Transaction,
    { queue, subject }: { queue: ScopedQueueEntry; subject: SessionSubject },
  ) {
    const { driverId } = queue.entry;
    const trip = (await tx.trips.findActiveByDriver(driverId))?.value;
    if (!trip || !isActiveTrip(trip) || trip.driverId !== driverId) return ok(null);
    const [town, rider] = await Promise.all([
      tx.towns.get(trip.townId),
      this.ports.matchedRiderContacts.get({ bookingId: trip.bookingId, subject }),
    ]);
    if (!rider.ok) return rider;
    return ok({
      bookingId: trip.bookingId,
      status: trip.status,
      destination: mapDriverLandmark(town?.value.landmarks, trip.fare.route.destinationLandmarkId),
      fareInPaise: trip.fare.amount.paise,
      rider: rider.value,
    });
  }
}

async function getQueuePosition(
  tx: Transaction,
  queue: ScopedQueueEntry,
  ranking: DriverRankingPolicy,
) {
  const { driverId, standId, availability } = queue.entry;
  if (availability === 'offline') return null;
  const records = await tx.drivers.listForStands(queue, [standId]);
  const online = records
    .map(({ value }) => value.entry)
    .filter((entry) => entry.availability === 'online');
  const index = ranking.rank(online).findIndex((entry) => entry.driverId === driverId);
  return index < 0 ? null : index + 1;
}
