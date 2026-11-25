import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext, CoordinatorMembership } from '@application/ports/actor-context';
import { sameScope } from '@application/operations/booking-authority';
import { err } from '@domain/shared/result';
import { getDriverSession } from '@application/operations/driver-session';
import type { CommandExecutor } from '@application/operations/execute-command';
import { setAvailability } from '@application/operations/set-availability';
import type { Clock } from '@application/ports/clock';
import type { Instant } from '@domain/shared/instant.value-object';
import type { Transaction } from '@application/ports/unit-of-work';
import type { IdGenerator } from '@application/ports/id-generator';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import type { SetDriverAvailabilityInput } from './set-driver-availability.input';

export class SetDriverAvailability {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
      declinePenalty: DeclinePenaltyPolicy;
    },
    private readonly schema: InputSchema<SetDriverAvailabilityInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids, declinePenalty } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'availability', schema: this.schema },
      input,
      (value, membership) => {
        const { actor } = value;
        const actorKey =
          actor.type === 'driver'
            ? `session:${actor.subject}`
            : `coordinator:${actor.coordinatorId}`;
        return commands.run(
          {
            actor: actorKey,
            name: 'set_driver_availability',
            target:
              actor.type === 'stand_coordinator'
                ? { kind: 'stand', standId: actor.standId }
                : { kind: 'device' },
            input: value,
          },
          (tx) =>
            decideAvailability(tx, value, { now: clock.now(), ids, declinePenalty, membership }),
        );
      },
    );
  }
}

async function decideAvailability(
  tx: Transaction,
  value: SetDriverAvailabilityInput,
  {
    membership,
    ...options
  }: {
    membership: CoordinatorMembership | undefined;
    now: Instant;
    ids: IdGenerator;
    declinePenalty: DeclinePenaltyPolicy;
  },
) {
  const { actor } = value;
  if (actor.type === 'stand_coordinator') {
    const stand = (await tx.stands.get(actor.standId))?.value;
    if (!stand || !membership || !sameScope(stand, membership))
      return err({ code: 'forbidden' as const });
    return setAvailability(tx, { ...value, actor }, options);
  }
  const session = await getDriverSession(tx.devices, actor.subject);
  if (!session.ok) return session;
  return setAvailability(
    tx,
    { ...value, actor: { type: 'driver', driverId: session.value.driverId } },
    options,
  );
}
