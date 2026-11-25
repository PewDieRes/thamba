import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import {
  advanceBookingDispatch,
  type DispatchPolicies,
} from '@application/operations/advance-booking-dispatch';
import type { CommandExecutor } from '@application/operations/execute-command';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { AdvanceDispatchInput } from './advance-dispatch.input';

export class AdvanceDispatch {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
    } & DispatchPolicies,
    private readonly schema: InputSchema<AdvanceDispatchInput>,
  ) {}

  execute(input: unknown) {
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'sweep', schema: this.schema },
      input,
      (value) => this.advance(value),
    );
  }

  private async advance(value: AdvanceDispatchInput) {
    const { commands, clock, ...dispatch } = this.ports;
    const attempt = () =>
      commands.run(
        {
          actor: 'dispatch',
          name: 'advance_dispatch',
          target: { kind: 'sweep_booking', bookingId: value.bookingId },
          input: value,
        },
        (tx) => advanceBookingDispatch(tx, value.bookingId, { ...dispatch, now: clock.now() }),
      );
    const result = await attempt();
    return !result.ok && result.error.code === 'ConcurrencyConflict' ? attempt() : result;
  }
}
