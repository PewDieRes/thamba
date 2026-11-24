import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
import type { CommandExecutor } from '@application/operations/execute-command';
import { progressTrip } from '@application/operations/progress-trip';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { CompleteTripInput } from './complete-trip.input';

export class CompleteTrip {
  constructor(
    private readonly ports: { commands: CommandExecutor; clock: Clock; ids: IdGenerator },
    private readonly schema: InputSchema<CompleteTripInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids } = this.ports;
    return validateInput(this.schema, input, (value) =>
      commands.run(
        { actor: `session:${value.subject}`, name: 'complete_trip', input: value },
        (tx) => progressTrip(tx, value, { ids, now: clock.now(), action: 'completeTrip' }),
      ),
    );
  }
}
