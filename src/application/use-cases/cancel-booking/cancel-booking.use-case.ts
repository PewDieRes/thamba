import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
import { mapBookingProgress } from '@application/operations/booking.mapper';
import { commit, type CommandExecutor } from '@application/operations/execute-command';
import { progressTrip } from '@application/operations/progress-trip';
import { saveBookingDecision } from '@application/operations/save-booking-decision';
import { saveOfferResolution } from '@application/operations/save-offer-resolution';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { Transaction } from '@application/ports/unit-of-work';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import type { Instant } from '@domain/shared/instant.value-object';
import { err } from '@domain/shared/result';
import type { CancelBookingInput } from './cancel-booking.input';

interface CancellationOptions {
  readonly now: Instant;
  readonly ids: IdGenerator;
  readonly declinePenalty: DeclinePenaltyPolicy;
}

export class CancelBooking {
  constructor(
    private readonly ports: {
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
      declinePenalty: DeclinePenaltyPolicy;
    },
    private readonly schema: InputSchema<CancelBookingInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids, declinePenalty } = this.ports;
    return validateInput(this.schema, input, (value) => {
      const { actor } = value;
      const actorKey =
        actor.type === 'rider' ? `rider:${actor.riderId}` : `session:${actor.subject}`;
      return commands.run({ actor: actorKey, name: 'cancel_booking', input: value }, (tx) =>
        cancelBooking(tx, value, { now: clock.now(), ids, declinePenalty }),
      );
    });
  }
}

async function cancelBooking(
  tx: Transaction,
  { actor, bookingId }: CancelBookingInput,
  options: CancellationOptions,
) {
  const { now, ids } = options;
  if (actor.type === 'driver') {
    return progressTrip(tx, { ...actor, bookingId }, { now, ids, action: 'cancelByDriver' });
  }
  const booking = await tx.bookings.get(bookingId);
  if (booking?.value.state.riderId !== actor.riderId) return err({ code: 'not_found' as const });
  const decision = booking.value.cancelByRider(actor.riderId, now);
  if (!decision.ok) return decision;
  const saved = booking.value.state.offer
    ? await saveOfferResolution(tx, { ...options, before: booking, decision: decision.value })
    : await saveBookingDecision(tx, decision.value, { ids, expectedVersion: booking.version });
  return saved.ok ? commit(mapBookingProgress(decision.value.booking)) : saved;
}
