import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
import type { CommandExecutor } from '@application/operations/execute-command';
import { progressTrip } from '@application/operations/progress-trip';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { StartTripInput } from './start-trip.input';

export class StartTrip {
  constructor(
    private readonly ports: { commands: CommandExecutor; clock: Clock; ids: IdGenerator },
    private readonly schema: InputSchema<StartTripInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids } = this.ports;
    return validateInput(this.schema, input, (value) =>
      commands.run({ actor: `session:${value.subject}`, name: 'start_trip', input: value }, (tx) =>
        progressTrip(tx, value, { ids, now: clock.now(), action: 'confirmPickup' }),
      ),
    );
  }
}
