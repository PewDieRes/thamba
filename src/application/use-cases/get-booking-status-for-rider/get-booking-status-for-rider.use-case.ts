import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
import { sameScope } from '@application/operations/booking-authority';
import type { Booking } from '@domain/dispatch/booking';
import type { Instant } from '@domain/shared/instant.value-object';
import { mapBookingProgress } from '@application/operations/booking.mapper';
import type { Clock } from '@application/ports/clock';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { err, ok } from '@domain/shared/result';
import { evaluateBookingCapability } from '@domain/town/town';
import type { GetBookingStatusForRiderInput } from './get-booking-status-for-rider.input';

export class GetBookingStatusForRider {
  constructor(
    private readonly ports: { unitOfWork: UnitOfWork; clock: Clock },
    private readonly schema: InputSchema<GetBookingStatusForRiderInput>,
  ) {}

  execute(input: unknown) {
    const { unitOfWork, clock } = this.ports;
    return validateInput(this.schema, input, ({ riderId, bookingId }) =>
      unitOfWork.run(async (tx) => {
        const booking = (await tx.bookings.get(bookingId))?.value;
        if (booking?.state.riderId !== riderId) return err({ code: 'not_found' });
        return ok(await projectRiderStatus(tx, booking, clock.now()));
      }),
    );
  }
}

async function projectRiderStatus(tx: Transaction, booking: Booking, now: Instant) {
  const { state } = booking;
  const town = (await tx.towns.get(state.townId))?.value;
  const coordinatorContact = await getCoordinatorContact(tx.stands, state);
  return {
    ...mapBookingProgress(booking),
    route: state.fare.route,
    fareInPaise: state.fare.amount.paise,
    fareChartVersion: state.fare.fareChartVersion,
    grievanceContact: town?.grievanceContact,
    capability: town && evaluateBookingCapability(town.town, now),
    coordinatorContact,
    pickupAtEpochMilliseconds: state.pickupAt?.epochMilliseconds,
  };
}

async function getCoordinatorContact(stands: Transaction['stands'], state: Booking['state']) {
  if (state.status !== 'no_driver_found') return undefined;
  const stand = (await stands.get(state.standId))?.value;
  return stand && sameScope(stand, state) ? stand.coordinatorContact : undefined;
}
