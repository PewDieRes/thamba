import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { AuthSession } from '@application/ports/auth-session';
import type { ActorContext } from '@application/ports/actor-context';
import type { Clock } from '@application/ports/clock';
import type { DemoRunProvisioner } from '@application/ports/demo-run-provisioner';
import type { IdGenerator } from '@application/ports/id-generator';
import type { UnitOfWork } from '@application/ports/unit-of-work';
import { err, ok } from '@domain/shared/result';
import { evaluateBookingCapability } from '@domain/town/town';
import { buildDemoRun } from './demo-scenario';
import type { StartDemoRunInput } from './start-demo-run.input';

export class StartDemoRun {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      demoSession?: Pick<AuthSession, 'ensureAnonymous'>;
      unitOfWork: UnitOfWork;
      clock: Clock;
      ids: IdGenerator;
      demoRuns: DemoRunProvisioner;
    },
    private readonly schema: InputSchema<StartDemoRunInput>,
  ) {}

  async execute(input: unknown) {
    const { actorContext, unitOfWork, clock, ids, demoRuns, demoSession } = this.ports;
    const authenticated = await demoSession?.ensureAnonymous();
    if (authenticated && !authenticated.ok) return authenticated;
    return validateActorInput(
      { actorContext, role: 'rider', schema: this.schema },
      input,
      async (value) => {
        const { townId, standId: templateStandId, riderId } = value;
        const now = clock.now();
        const template = await unitOfWork.run(
          async ({ towns, stands }) => {
            const town = (await towns.get(townId))?.value.town;
            if (!town || evaluateBookingCapability(town, now).kind !== 'simulated') {
              return err({ code: 'booking_unavailable' });
            }
            const stand = (await stands.get(templateStandId))?.value;
            if (!stand || stand.townId !== townId || stand.demoRunId !== undefined) {
              return err({ code: 'not_found' });
            }
            return ok(stand);
          },
          { target: { kind: 'town', townId } },
        );
        if (!template.ok) return template;
        const scope = { demoRunId: ids.next<'DemoRun'>(), standId: ids.next<'Stand'>(), townId };
        const fixtures = buildDemoRun(value.scenario ?? 'successful_trip', {
          ...scope,
          riderId,
          templateStand: template.value,
          driverId: ids.next<'Driver'>(),
          now,
        });
        const saved = await demoRuns.provision(fixtures);
        return saved.ok ? ok(scope) : saved;
      },
    );
  }
}
