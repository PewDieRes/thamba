import type { RiderStatusView } from '@application/contracts/rider-status-view';
import type { DispatchAdvancer } from '@application/ports/dispatch-advancer';
import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import { sameScope } from '@application/operations/booking-authority';
import type { Instant } from '@domain/shared/instant.value-object';
import { ACTIVE_BOOKING_STATUSES } from '@domain/dispatch/booking-status';
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
      advanceDispatch?: DispatchAdvancer;
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
        const snapshot = await unitOfWork.run(
          async (tx) => ok(await projectRiderStatus(tx, booking, clock.now())),
          { target: { kind: 'rider_booking', bookingId } },
        );
        if (snapshot.ok && shouldAdvance(booking)) {
          await this.ports.advanceDispatch?.execute({ bookingId });
        }
        return snapshot;
      },
    );
  }
}

async function projectRiderStatus(tx: Transaction, state: RiderBookingRecord, now: Instant) {
  const town = (await tx.towns.get(state.townId))?.value;
  const stand = await getStatusStand(tx.stands, state);
  const {
    name: standName,
    names: standNames,
    coordinatorContacts,
    coordinatorContact,
  } = stand ?? {};
  const { grievanceContact, grievanceContacts } = town ?? {};
  const view: RiderStatusView = {
    ...mapBookingProgress({ state }),
    grievanceContact,
    grievanceContacts,
    capability: town && evaluateBookingCapability(town.town, now),
    coordinatorContact: state.status === 'no_driver_found' ? coordinatorContact : undefined,
    coordinatorContacts,
    standName,
    standNames,
    matchedDriver: state.matchedDriver,
    pickupAtEpochMilliseconds: state.pickupAt?.epochMilliseconds,
  };
  return {
    ...view,
    route: state.fare.route,
    fareInPaise: state.fare.amount.paise,
    fareChartVersion: state.fare.fareChartVersion,
  };
}

async function getStatusStand(stands: Transaction['stands'], state: RiderBookingRecord) {
  const stand = (await stands.get(state.standId))?.value;
  return stand && sameScope(stand, state) ? stand : undefined;
}

function shouldAdvance(booking: RiderBookingRecord) {
  if (booking.demoRunId) return ACTIVE_BOOKING_STATUSES.some((status) => status === booking.status);
  return (
    booking.status === 'scheduled' ||
    booking.status === 'requested' ||
    booking.status === 'offering'
  );
}
