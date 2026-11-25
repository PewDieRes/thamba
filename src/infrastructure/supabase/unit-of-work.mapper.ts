import type { RepositoryAccess } from '@application/ports/repository-access';
import type { SessionActor } from '@application/ports/actor-context';
import type { Json } from './database.types';
import { LIVE_SCOPE_ID } from './row.mapper';
import type { Filter, RowWrite } from './repository-storage';
import type { CommandScope } from './command-scope';

export function toFilterJson(filter: Filter): Json {
  return Object.fromEntries(
    Object.entries(filter).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null ? [...value] : value,
    ]),
  );
}

export function toWriteBatch(writes: readonly RowWrite[]): Json {
  return writes.map(({ resource, row, expectedVersion }) => ({
    resource,
    row,
    expectedVersion,
  }));
}

export function readCommandScope(row: object): CommandScope | undefined {
  const fields = row as Record<string, unknown>;
  if (typeof fields.town_id !== 'string') return undefined;
  const scope = fields.run_scope_id === undefined ? fields.demo_run_id : fields.run_scope_id;
  if (scope !== null && typeof scope !== 'string') return undefined;
  return { town_id: fields.town_id, demo_run_id: scope === LIVE_SCOPE_ID ? null : scope };
}

export function createWriteContext(
  writes: readonly RowWrite[],
  scope: CommandScope | undefined,
  actor: SessionActor | undefined,
): Json | undefined {
  if (!scope || !actor) return undefined;
  const standIds = [...(scope.stand_ids ?? []), ...writes.flatMap(({ row }) => readStandIds(row))];
  const command = writes.find(({ resource }) => resource === 'commands')?.row;
  return {
    ...scope,
    stand_ids: [...new Set(standIds)],
    actor_kind: actor.kind,
    actor_subject: actor.kind === 'sweep' ? null : actor.subject,
    command_actor: typeof command?.actor === 'string' ? command.actor : null,
    command_key: typeof command?.command_key === 'string' ? command.command_key : null,
  };
}

export function readStandIds(row: object): string[] {
  const fields = row as Record<string, unknown>;
  const search: unknown[] = Array.isArray(fields.search_stand_ids) ? fields.search_stand_ids : [];
  return [fields.stand_id, ...search].filter((id): id is string => typeof id === 'string');
}

export function createReadContext(
  { target, command }: RepositoryAccess,
  actor: SessionActor | undefined,
): Json {
  return {
    target: { ...target },
    actor_kind: actor?.kind ?? 'public',
    actor_subject: getActorSubject(actor),
    command_actor: command?.actor ?? null,
    command_key: command?.key ?? null,
  };
}

function getActorSubject(actor: SessionActor | undefined) {
  return actor && actor.kind !== 'sweep' ? actor.subject : null;
}
