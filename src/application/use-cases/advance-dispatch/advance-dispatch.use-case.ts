import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
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
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
    } & DispatchPolicies,
    private readonly schema: InputSchema<AdvanceDispatchInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ...dispatch } = this.ports;
    return validateInput(this.schema, input, async (value) => {
      const advance = () =>
        commands.run({ actor: 'dispatch', name: 'advance_dispatch', input: value }, (tx) =>
          advanceBookingDispatch(tx, value.bookingId, { ...dispatch, now: clock.now() }),
        );
      const result = await advance();
      return !result.ok && result.error.code === 'ConcurrencyConflict' ? advance() : result;
    });
  }
}
