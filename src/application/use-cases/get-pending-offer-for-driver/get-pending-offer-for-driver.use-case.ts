import { mapDriverLandmark } from '@application/operations/driver-landmark.mapper';
import type { DriverOfferView } from '@application/contracts/driver-state-view';
import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import { canBookTown, servesPickup } from '@application/operations/booking-authority';
import { getDriverSession } from '@application/operations/driver-session';
import type { Clock } from '@application/ports/clock';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { projectPendingOfferView } from '@domain/dispatch/pending-offer-view';
import { isRideOfferExpired } from '@domain/dispatch/ride-offer';
import type { DriverSession } from '@domain/identity/driver-device';
import type { Instant } from '@domain/shared/instant.value-object';
import { ok } from '@domain/shared/result';
import type { GetPendingOfferForDriverInput } from './get-pending-offer-for-driver.input';

export class GetPendingOfferForDriver {
  constructor(
    private readonly ports: { actorContext: ActorContext; unitOfWork: UnitOfWork; clock: Clock },
    private readonly schema: InputSchema<GetPendingOfferForDriverInput>,
  ) {}

  execute(input: unknown) {
    const { unitOfWork, clock } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'driver', schema: this.schema },
      input,
      ({ subject, includeDisplay }) =>
        unitOfWork.run(
          async (tx) => {
            const now = clock.now();
            const session = await getDriverSession(tx.devices, subject);
            if (!session.ok) return session;
            const recorded = (await tx.offers.findPendingByDriver(session.value.driverId))?.value;
            if (!recorded || isRideOfferExpired(recorded.offer, now)) return ok(undefined);
            return projectOffer(tx, recorded.offer, {
              driver: session.value.driver,
              now,
              includeDisplay,
            });
          },
          { target: { kind: 'device' } },
        ),
    );
  }
}

async function projectOffer(
  tx: Transaction,
  offer: import('@domain/dispatch/ride-offer').RideOffer,
  {
    driver,
    now,
    includeDisplay,
  }: { driver: DriverSession; now: Instant; includeDisplay?: boolean | undefined },
) {
  const state = (await tx.bookings.get(offer.bookingId))?.value.state;
  if (state?.offer?.offerId !== offer.offerId) return ok(undefined);
  const [town, stand] = await Promise.all([
    tx.towns.get(state.townId),
    tx.stands.get(offer.standId).then((record) => record?.value),
  ]);
  if (!town || !canBookTown(town.value, state, now)) return ok(undefined);
  const pickupId = state.fare.route.pickupLandmarkId;
  if (!servesPickup(stand, state, pickupId)) return ok(undefined);
  const pickupCue = stand.pickupCues[pickupId];
  if (pickupCue === undefined) return ok(undefined);
  const projected = projectPendingOfferView(state, { driver, pickupCue }, now);
  return withOfferDisplay(projected, {
    includeDisplay,
    pickup: mapDriverLandmark(town.value.landmarks, pickupId),
    pickupCueTranslations: stand.pickupCueTranslations?.[pickupId],
  });
}

function withOfferDisplay(
  projected: ReturnType<typeof projectPendingOfferView>,
  {
    includeDisplay,
    ...display
  }: Pick<DriverOfferView, 'pickup' | 'pickupCueTranslations'> & {
    includeDisplay?: boolean | undefined;
  },
) {
  return projected.ok && includeDisplay ? ok({ ...projected.value, ...display }) : projected;
}
