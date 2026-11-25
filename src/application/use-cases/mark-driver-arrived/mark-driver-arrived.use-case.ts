import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import type { CommandExecutor } from '@application/operations/execute-command';
import { progressTrip } from '@application/operations/progress-trip';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { MarkDriverArrivedInput } from './mark-driver-arrived.input';

export class MarkDriverArrived {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
    },
    private readonly schema: InputSchema<MarkDriverArrivedInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'driver', schema: this.schema },
      input,
      (value) =>
        commands.run(
          {
            actor: `session:${value.subject}`,
            name: 'mark_driver_arrived',
            target: { kind: 'driver_booking', bookingId: value.bookingId },
            input: value,
          },
          (tx) => progressTrip(tx, value, { ids, now: clock.now(), action: 'reportArrival' }),
        ),
    );
  }
}
