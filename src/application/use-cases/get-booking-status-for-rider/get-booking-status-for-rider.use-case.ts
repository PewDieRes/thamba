import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import { sameScope } from '@application/operations/booking-authority';
import type { Instant } from '@domain/shared/instant.value-object';
import { mapBookingProgress } from '@application/operations/booking.mapper';
import type {
  RiderBookingReader,
  RiderBookingRecord,
} from '@application/ports/rider-booking-reader';
import type { Clock } from '@application/ports/clock';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { err, ok } from '@domain/shared/result';
import { evaluateBookingCapability } from '@domain/town/town';
import type { GetBookingStatusForRiderInput } from './get-booking-status-for-rider.input';

export class GetBookingStatusForRider {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      unitOfWork: UnitOfWork;
      riderBookings: RiderBookingReader;
      clock: Clock;
    },
    private readonly schema: InputSchema<GetBookingStatusForRiderInput>,
  ) {}

  execute(input: unknown) {
    const { unitOfWork, clock } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'rider', schema: this.schema },
      input,
      async ({ riderId, bookingId }) => {
        const result = await this.ports.riderBookings.get(bookingId);
        if (!result.ok) return result;
        const booking = result.value;
        if (booking?.riderId !== riderId) return err({ code: 'not_found' });
        return unitOfWork.run(
          async (tx) => ok(await projectRiderStatus(tx, booking, clock.now())),
          { target: { kind: 'rider_booking', bookingId } },
        );
      },
    );
  }
}

async function projectRiderStatus(tx: Transaction, state: RiderBookingRecord, now: Instant) {
  const town = (await tx.towns.get(state.townId))?.value;
  const coordinatorContact = await getCoordinatorContact(tx.stands, state);
  return {
    ...mapBookingProgress({ state }),
    route: state.fare.route,
    fareInPaise: state.fare.amount.paise,
    fareChartVersion: state.fare.fareChartVersion,
    grievanceContact: town?.grievanceContact,
    capability: town && evaluateBookingCapability(town.town, now),
    coordinatorContact,
    pickupAtEpochMilliseconds: state.pickupAt?.epochMilliseconds,
  };
}

async function getCoordinatorContact(stands: Transaction['stands'], state: RiderBookingRecord) {
  if (state.status !== 'no_driver_found') return undefined;
  const stand = (await stands.get(state.standId))?.value;
  return stand && sameScope(stand, state) ? stand.coordinatorContact : undefined;
}
