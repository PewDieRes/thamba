import { AsyncLocalStorage } from 'node:async_hooks';
import type { SessionActor } from '@application/ports/actor-context';
import {
  createSessionSubject,
  createStandCoordinatorId,
  createStandId,
} from '@domain/shared/ids.value-object';
import type { createInMemoryContainer } from '@infrastructure/composition/container';
import { SCOPE } from './demo-data.fixtures';

function fields(input: unknown): Record<string, unknown> {
  return typeof input === 'object' && input !== null ? { ...input } : {};
}

function actorFor(input: unknown, name: string): SessionActor | undefined {
  if (name === 'advanceDispatch' || name === 'sweepDispatch') return { kind: 'sweep' };
  const value = fields(input);
  const actor = fields(value.actor);
  const coordinatorId = createStandCoordinatorId(value.coordinatorId ?? actor.coordinatorId);
  const standId = createStandId(value.standId ?? actor.standId);
  if (coordinatorId.ok && standId.ok) {
    return {
      kind: 'coordinator',
      subject: FALLBACK,
      memberships: [{ ...SCOPE, coordinatorId: coordinatorId.value, standId: standId.value }],
    };
  }
  const subject = createSessionSubject(readSubject(value, actor));
  return {
    kind: 'anonymous',
    subject: subject.ok ? subject.value : FALLBACK,
    hasDriverDevice: true,
  };
}

const FALLBACK = '88888888-8888-4888-8888-888888888888' as Extract<
  SessionActor,
  { kind: 'anonymous' }
>['subject'];

export function createTestActorContext() {
  const actors = new AsyncLocalStorage<SessionActor | undefined>();
  return {
    actorContext: {
      getActor: () => Promise.resolve(actors.getStore()),
    },
    wrap(app: ReturnType<typeof createInMemoryContainer>) {
      for (const [name, useCase] of Object.entries(app)) {
        if (!('execute' in useCase)) continue;
        const execute = useCase.execute.bind(useCase);
        Object.defineProperty(useCase, 'execute', {
          configurable: true,
          writable: true,
          value: (input: unknown) => actors.run(actorFor(input, name), () => execute(input)),
        });
      }
      return app;
    },
  };
}

function readSubject(value: Record<string, unknown>, actor: Record<string, unknown>) {
  return value.subject ?? value.riderId ?? actor.subject ?? actor.riderId;
}
