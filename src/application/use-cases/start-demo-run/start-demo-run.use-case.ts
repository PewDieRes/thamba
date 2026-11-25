import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import type { Clock } from '@application/ports/clock';
import type { DemoRunProvisioner } from '@application/ports/demo-run-provisioner';
import type { IdGenerator } from '@application/ports/id-generator';
import type { UnitOfWork } from '@application/ports/unit-of-work';
import { err, ok } from '@domain/shared/result';
import { evaluateBookingCapability } from '@domain/town/town';
import type { StartDemoRunInput } from './start-demo-run.input';

export class StartDemoRun {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      unitOfWork: UnitOfWork;
      clock: Clock;
      ids: IdGenerator;
      demoRuns: DemoRunProvisioner;
    },
    private readonly schema: InputSchema<StartDemoRunInput>,
  ) {}

  execute(input: unknown) {
    const { actorContext, unitOfWork, clock, ids, demoRuns } = this.ports;
    return validateActorInput(
      { actorContext, role: 'rider', schema: this.schema },
      input,
      async (value) => {
        const { townId, standId: templateStandId, riderId } = value;
        const canStart = await unitOfWork.run(
          async ({ towns }) => {
            const town = (await towns.get(townId))?.value.town;
            return ok(town && evaluateBookingCapability(town, clock.now()).kind === 'simulated');
          },
          { target: { kind: 'town', townId } },
        );
        if (!canStart.ok) return canStart;
        if (!canStart.value) return err({ code: 'booking_unavailable' });
        const scope = { demoRunId: ids.next<'DemoRun'>(), standId: ids.next<'Stand'>(), townId };
        const saved = await demoRuns.provision({ ...scope, templateStandId, riderId });
        return saved.ok ? ok(scope) : saved;
      },
    );
  }
}
