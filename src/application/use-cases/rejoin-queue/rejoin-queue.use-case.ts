import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import { getDriverSession } from '@application/operations/driver-session';
import type { CommandExecutor } from '@application/operations/execute-command';
import { setAvailability } from '@application/operations/set-availability';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import type { RejoinQueueInput } from './rejoin-queue.input';

export class RejoinQueue {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
      declinePenalty: DeclinePenaltyPolicy;
    },
    private readonly schema: InputSchema<RejoinQueueInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids, declinePenalty } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'driver', schema: this.schema },
      input,
      (value) =>
        commands.run(
          {
            actor: `session:${value.subject}`,
            name: 'rejoin_queue',
            target: { kind: 'device' },
            input: value,
          },
          async (tx) => {
            const now = clock.now();
            const session = await getDriverSession(tx.devices, value.subject);
            if (!session.ok) return session;
            const { driverId } = session.value;
            return setAvailability(
              tx,
              { actor: { type: 'driver', driverId }, driverId, isOnline: true },
              { now, ids, declinePenalty },
            );
          },
        ),
    );
  }
}
