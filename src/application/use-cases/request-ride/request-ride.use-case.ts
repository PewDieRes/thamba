import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import { confirmRide } from '@application/operations/confirm-booking';
import type { CommandExecutor } from '@application/operations/execute-command';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { StandFallbackPolicy } from '@domain/dispatch/stand-fallback.policy';
import type { RequestRideInput } from './request-ride.input';

export class RequestRide {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
      standFallback: StandFallbackPolicy;
    },
    private readonly schema: InputSchema<RequestRideInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids, standFallback } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'rider', schema: this.schema },
      input,
      (value) =>
        commands.run(
          {
            actor: `rider:${value.riderId}`,
            name: 'request_ride',
            target: { kind: 'quote', quoteId: value.quoteId },
            input: value,
          },
          (tx) =>
            confirmRide(tx, value, { ids, now: clock.now(), mode: 'immediate', standFallback }),
        ),
    );
  }
}
