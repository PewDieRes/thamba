import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
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
    private readonly ports: { unitOfWork: UnitOfWork; clock: Clock },
    private readonly schema: InputSchema<GetPendingOfferForDriverInput>,
  ) {}

  execute(input: unknown) {
    const { unitOfWork, clock } = this.ports;
    return validateInput(this.schema, input, ({ subject }) =>
      unitOfWork.run(async (tx) => {
        const now = clock.now();
        const session = await getDriverSession(tx.devices, subject);
        if (!session.ok) return session;
        const recorded = (await tx.offers.findPendingByDriver(session.value.driverId))?.value;
        if (!recorded || isRideOfferExpired(recorded.offer, now)) return ok(undefined);
        return projectOffer(tx, recorded.offer, { driver: session.value.driver, now });
      }),
    );
  }
}

async function projectOffer(
  tx: Transaction,
  offer: import('@domain/dispatch/ride-offer').RideOffer,
  { driver, now }: { driver: DriverSession; now: Instant },
) {
  const state = (await tx.bookings.get(offer.bookingId))?.value.state;
  if (state?.offer?.offerId !== offer.offerId) return ok(undefined);
  const [town, stand] = await Promise.all([
    tx.towns.get(state.townId),
    tx.stands.get(offer.standId),
  ]);
  if (!canBookTown(town?.value, state, now)) return ok(undefined);
  const pickupId = state.fare.route.pickupLandmarkId;
  const pickupCue =
    stand && servesPickup(stand.value, state, pickupId)
      ? stand.value.pickupCues[pickupId]
      : undefined;
  if (pickupCue === undefined) return ok(undefined);
  return projectPendingOfferView(state, { driver, pickupCue }, now);
}
