import type { Json } from './database.types';
import { LIVE_SCOPE_ID } from './row.mapper';
import type { Filter, RowWrite } from './repository-storage';
export interface CommandScope {
  readonly town_id: string;
  readonly demo_run_id: string | null;
}

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
