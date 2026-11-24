import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
import { confirmRide } from '@application/operations/confirm-booking';
import type { CommandExecutor } from '@application/operations/execute-command';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { StandFallbackPolicy } from '@domain/dispatch/stand-fallback.policy';
import type { RequestRideInput } from './request-ride.input';

export class RequestRide {
  constructor(
    private readonly ports: {
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
      standFallback: StandFallbackPolicy;
    },
    private readonly schema: InputSchema<RequestRideInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids, standFallback } = this.ports;
    return validateInput(this.schema, input, (value) =>
      commands.run({ actor: `rider:${value.riderId}`, name: 'request_ride', input: value }, (tx) =>
        confirmRide(tx, value, { ids, now: clock.now(), mode: 'immediate', standFallback }),
      ),
    );
  }
}
