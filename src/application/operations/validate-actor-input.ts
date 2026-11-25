import { validateInput, type InputSchema } from '../contracts/input-schema';
import type { ActorContext, CoordinatorMembership, SessionActor } from '../ports/actor-context';
import type { ApplicationResult } from '../ports/application-result';
import { err } from '@domain/shared/result';

type Role =
  'rider' | 'driver' | 'coordinator' | 'invite' | 'cancellation' | 'availability' | 'sweep';
type Input = Record<string, unknown>;

function getFields(value: unknown): Input {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

export async function validateActorInput<T, V>(
  {
    actorContext,
    role,
    schema,
  }: { actorContext: ActorContext; role: Role; schema: InputSchema<T> },
  input: unknown,
  execute: (
    value: T,
    membership: CoordinatorMembership | undefined,
  ) => Promise<ApplicationResult<V>>,
): Promise<ApplicationResult<V>> {
  const actor = await actorContext.getActor();
  if (!actor) return err({ code: 'unauthenticated' });
  const fields = getFields(input);
  const bound = resolveFields(actor, fields, role);
  return bound
    ? validateInput(schema, bound.fields, (value) => execute(value, bound.membership))
    : err({ code: 'forbidden' });
}

function resolveFields(actor: SessionActor, fields: Input, role: Role) {
  if (actor.kind === 'sweep') return role === 'sweep' ? { fields } : undefined;
  if (actor.kind === 'anonymous') {
    const bound = bindAnonymous(fields, role, actor);
    return bound ? { fields: bound } : undefined;
  }
  if (role !== 'coordinator' && role !== 'availability') return undefined;
  const standId = getFields(fields.actor).standId ?? fields.standId;
  const membership = actor.memberships.find((item) => item.standId === standId);
  return membership ? { fields: bindCoordinator(fields, membership, role), membership } : undefined;
}

function bindCoordinator(fields: Input, membership: CoordinatorMembership, role: Role) {
  const { standId, coordinatorId } = membership;
  return role === 'coordinator'
    ? { ...fields, standId, coordinatorId }
    : { ...fields, actor: { type: 'stand_coordinator', standId, coordinatorId } };
}

function bindAnonymous(
  fields: Input,
  role: Role,
  actor: Extract<SessionActor, { kind: 'anonymous' }>,
) {
  const { subject, hasDriverDevice } = actor;
  if (role === 'rider') return { ...fields, riderId: subject };
  if (role === 'invite') return { ...fields, subject };
  if (role === 'cancellation') return bindCancellation(fields, actor);
  if (!hasDriverDevice) return undefined;
  if (role === 'driver') return { ...fields, subject };
  if (role === 'availability' && getFields(fields.actor).type !== 'stand_coordinator') {
    return { ...fields, actor: { type: 'driver', subject } };
  }
  return undefined;
}

function bindCancellation(
  fields: Input,
  { subject, hasDriverDevice }: Extract<SessionActor, { kind: 'anonymous' }>,
) {
  const type = getFields(fields.actor).type;
  if (type === 'driver')
    return hasDriverDevice ? { ...fields, actor: { type, subject } } : undefined;
  if (type !== undefined && type !== 'rider') return undefined;
  return { ...fields, actor: { type: 'rider', riderId: subject } };
}
