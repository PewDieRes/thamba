import { validateActorInput } from '@application/operations/validate-actor-input';
import type { InputSchema } from '@application/contracts/input-schema';
import type { ActorContext } from '@application/ports/actor-context';
import type { Clock } from '@application/ports/clock';
import type { DemoComplaintWriter } from '@application/ports/demo-complaint-writer';
import type { SubmitDemoComplaintInput } from './submit-demo-complaint.input';

export class SubmitDemoComplaint {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      clock: Clock;
      complaints: DemoComplaintWriter;
    },
    private readonly schema: InputSchema<SubmitDemoComplaintInput>,
  ) {}

  execute(input: unknown) {
    const { actorContext, clock, complaints } = this.ports;
    return validateActorInput(
      { actorContext, role: 'rider', schema: this.schema },
      input,
      (value) => complaints.save({ ...value, now: clock.now() }),
    );
  }
}
