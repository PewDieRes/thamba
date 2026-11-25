import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import { commit, type CommandExecutor } from '@application/operations/execute-command';
import { issueFareQuote } from '@application/operations/quote-fare';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import { Instant } from '@domain/shared/instant.value-object';
import { err } from '@domain/shared/result';
import type { QuoteFareInput } from './quote-fare.input';

export class QuoteFare {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
    },
    private readonly schema: InputSchema<QuoteFareInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'rider', schema: this.schema },
      input,
      (value) =>
        commands.run(
          {
            actor: `rider:${value.riderId}`,
            name: 'quote_fare',
            target: { kind: 'town', townId: value.townId, demoRunId: value.demoRunId },
            input: value,
          },
          async (tx) => {
            const now = clock.now();
            const { townId, demoRunId, pickupAtEpochMilliseconds, ...quote } = value;
            const town = await tx.towns.get(townId);
            const chart = await tx.fareCharts.get(townId);
            if (!town || !chart) return err({ code: 'not_found' });
            const pickup = Instant.fromEpochMilliseconds(pickupAtEpochMilliseconds);
            const result = await issueFareQuote(
              {
                ...quote,
                townId,
                ...(demoRunId === undefined ? {} : { demoRunId }),
                ...(pickup.ok ? { pickupAt: pickup.value } : {}),
              },
              { town: town.value, chart: chart.value, now },
              { ids, quotes: tx.quotes },
            );
            return result.ok ? commit(result.value) : result;
          },
        ),
    );
  }
}
