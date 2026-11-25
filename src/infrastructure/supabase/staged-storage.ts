import type { WriteResult } from '@application/ports/application-result';
import {
  CONFLICT,
  SAVED,
  StorageFailure,
  type Filter,
  type Resource,
  type RepositorySnapshot,
  type Row,
  type RepositoryStorage,
  type RowWrite,
} from './repository-storage';
import type { CommandScope } from './command-scope';
import { readCommandScope, readStandIds } from './unit-of-work.mapper';
import type { RepositoryBackend } from './repository-storage';

function matches(row: object, filter: Filter): boolean {
  const fields = row as Record<string, unknown>;
  return Object.entries(filter).every(([key, value]) =>
    typeof value === 'string' || value === null
      ? fields[key] === value
      : value.some((item) => item === fields[key]),
  );
}

export class StagedStorage implements RepositoryStorage {
  readonly #writes: RowWrite[] = [];
  readonly #observedScopes = new Map<string, CommandScope>();
  #isOpen = true;

  constructor(
    private readonly backend: RepositoryBackend,
    private readonly snapshot: RepositorySnapshot,
  ) {}

  async list<Name extends Resource>(resource: Name, filter: Filter): Promise<Row<Name>[]> {
    const rows = await this.snapshot.read(resource, filter, this.snapshot.revision);
    for (const write of this.#writes) {
      if (write.resource !== resource) continue;
      const index = rows.findIndex((row) => matches(row, write.key));
      const staged = { ...write.row, version: (write.expectedVersion ?? 0) + 1 };
      if (matches(staged, filter)) {
        if (index === -1) rows.push(staged as unknown as Row<Name>);
        else rows[index] = staged as unknown as Row<Name>;
      } else if (index !== -1) rows.splice(index, 1);
    }
    if (resource !== 'commands' && resource !== 'events') {
      for (const row of rows) this.observeScope(row);
    }
    return rows;
  }

  async save(write: RowWrite): Promise<WriteResult> {
    if (!this.#isOpen) return CONFLICT;
    const rows = await this.list(write.resource, write.key);
    const current = rows[0] as { version?: number } | undefined;
    if (
      !this.isOpen() ||
      (current ? (current.version ?? 1) : null) !== write.expectedVersion ||
      rows.length > 1
    ) {
      return CONFLICT;
    }
    const overlapping = this.#writes.some(
      (pending) =>
        pending.resource === write.resource &&
        matches(pending.row, write.key) &&
        pending.expectedVersion === write.expectedVersion,
    );
    if (overlapping) return CONFLICT;
    this.#writes.push(write);
    return SAVED;
  }

  private observeScope(row: object): void {
    const scope = readCommandScope(row);
    if (!scope) return;
    const key = JSON.stringify(scope);
    const existing = this.#observedScopes.get(key)?.stand_ids ?? [];
    const standIds = [...new Set([...existing, ...readStandIds(row)])];
    this.#observedScopes.set(key, { ...scope, stand_ids: standIds });
  }

  async commit(): Promise<void> {
    this.close();
    if (this.#writes.length === 0) {
      if ((await this.snapshot.getRevision()) !== this.snapshot.revision) {
        throw new StorageFailure('40001');
      }
      return;
    }
    const commandScopes = new Map<string, CommandScope>();
    for (const { resource, row } of this.#writes) {
      const scope = resource === 'commands' ? undefined : readCommandScope(row);
      if (scope) commandScopes.set(JSON.stringify(scope), scope);
    }
    const available = commandScopes.size > 0 ? commandScopes : this.#observedScopes;
    const [key] = available.keys();
    const scope =
      available.size === 1 && key
        ? (this.#observedScopes.get(key) ?? available.get(key))
        : undefined;
    await this.backend.commit(this.#writes, this.snapshot.revision, scope);
  }

  private isOpen(): boolean {
    return this.#isOpen;
  }

  close(): void {
    this.#isOpen = false;
  }
}
