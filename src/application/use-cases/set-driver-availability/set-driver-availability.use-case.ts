import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
import { getDriverSession } from '@application/operations/driver-session';
import type { CommandExecutor } from '@application/operations/execute-command';
import { setAvailability } from '@application/operations/set-availability';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import type { SetDriverAvailabilityInput } from './set-driver-availability.input';

export class SetDriverAvailability {
  constructor(
    private readonly ports: {
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
      declinePenalty: DeclinePenaltyPolicy;
    },
    private readonly schema: InputSchema<SetDriverAvailabilityInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids, declinePenalty } = this.ports;
    return validateInput(this.schema, input, (value) => {
      const { actor } = value;
      const actorKey =
        actor.type === 'driver' ? `session:${actor.subject}` : `coordinator:${actor.coordinatorId}`;
      return commands.run(
        { actor: actorKey, name: 'set_driver_availability', input: value },
        async (tx) => {
          const options = { now: clock.now(), ids, declinePenalty };
          if (actor.type === 'stand_coordinator')
            return setAvailability(tx, { ...value, actor }, options);
          const session = await getDriverSession(tx.devices, actor.subject);
          if (!session.ok) return session;
          return setAvailability(
            tx,
            { ...value, actor: { type: 'driver', driverId: session.value.driverId } },
            options,
          );
        },
      );
    });
  }
}
