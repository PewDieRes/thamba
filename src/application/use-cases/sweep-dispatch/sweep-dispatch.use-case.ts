import { validateActorInput } from '@application/operations/validate-actor-input';
import type { InputSchema } from '@application/contracts/input-schema';
import type { ActorContext } from '@application/ports/actor-context';
import type { DispatchAdvancer } from '@application/ports/dispatch-advancer';
import type { Clock } from '@application/ports/clock';
import type { SweepDispatchInput } from './sweep-dispatch.input';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { ok } from '@domain/shared/result';
import type { ApplicationResult } from '@application/ports/application-result';
import type { DueBookings } from '@application/ports/due-bookings';

const SWEEP_BATCH_SIZE = 25;
const MAX_BATCHES_PER_SWEEP = 2;
const SWEEP_BUDGET_MILLISECONDS = 7_500;

async function sweepDueBookings(
  dueBookings: DueBookings,
  now: () => Instant,
  advance: (bookingId: BookingId) => Promise<ApplicationResult<unknown>>,
) {
  const counts = { attempted: 0, advanced: 0, failed: 0 };
  const deadline = now().epochMilliseconds + SWEEP_BUDGET_MILLISECONDS;
  for (let batch = 0; batch < MAX_BATCHES_PER_SWEEP; batch++) {
    const due = await dueBookings.listDue(now(), SWEEP_BATCH_SIZE);
    if (!due.ok) return due;
    for (const bookingId of due.value) {
      if (now().epochMilliseconds >= deadline) return ok(counts);
      const result = await advance(bookingId);
      counts.attempted++;
      if (result.ok) counts.advanced++;
      else counts.failed++;
    }
    if (due.value.length < SWEEP_BATCH_SIZE || counts.failed > 0) break;
  }
  return ok(counts);
}

export class SweepDispatch {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      dueBookings: DueBookings;
      clock: Clock;
      advanceDispatch: DispatchAdvancer;
    },
    private readonly schema: InputSchema<SweepDispatchInput>,
  ) {}

  execute(input: unknown) {
    const { actorContext, dueBookings, clock, advanceDispatch } = this.ports;
    return validateActorInput({ actorContext, role: 'sweep', schema: this.schema }, input, () =>
      sweepDueBookings(
        dueBookings,
        () => clock.now(),
        (bookingId) => advanceDispatch.execute({ bookingId }),
      ),
    );
  }
}
