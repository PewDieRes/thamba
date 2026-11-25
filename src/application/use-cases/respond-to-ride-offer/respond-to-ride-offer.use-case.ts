import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import { respondToOffer } from '@application/operations/respond-to-offer';
import type { CommandExecutor } from '@application/operations/execute-command';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import type { RespondToRideOfferInput } from './respond-to-ride-offer.input';

export class RespondToRideOffer {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
      declinePenalty: DeclinePenaltyPolicy;
    },
    private readonly schema: InputSchema<RespondToRideOfferInput>,
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
            name: 'respond_to_ride_offer',
            target: { kind: 'offer', offerId: value.offerId },
            input: value,
          },
          (tx) => respondToOffer(tx, value, { now: clock.now(), ids, declinePenalty }),
        ),
    );
  }
}
