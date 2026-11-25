import type { RepositoryAccess } from '@application/ports/repository-access';
import type { Sql } from 'postgres';
import type { ActorContext } from '@application/ports/actor-context';
import type { WriteResult } from '@application/ports/application-result';
import type { Json } from './database.types';
import type { CommandScope } from './command-scope';
import {
  createReadContext,
  createWriteContext,
  toFilterJson,
  toWriteBatch,
} from './unit-of-work.mapper';
import {
  SAVED,
  StorageFailure,
  getWriteFailure,
  type Filter,
  type Resource,
  type Row,
  type RowWrite,
  type SnapshotReader,
  type RepositoryBackend,
} from './repository-storage';

export class PostgresRepositoryStorage implements RepositoryBackend {
  constructor(
    private readonly sql: Sql,
    private readonly actors: ActorContext,
  ) {}

  async getRevision() {
    const [row] = await this.sql<{ revision: string }[]>`
      select public.thamba_repository_revision() as revision
    `;
    if (!row) throw new StorageFailure(undefined);
    return row.revision;
  }

  list<Name extends Resource>(): Promise<Row<Name>[]> {
    return Promise.reject(new StorageFailure('42501'));
  }

  async openReader(access: RepositoryAccess | undefined): Promise<SnapshotReader> {
    if (!access) throw new StorageFailure('42501');
    const context = createReadContext(access, await this.actors.getActor());
    return (resource, filter, revision) => this.read(resource, filter, { revision, context });
  }

  private async read<Name extends Resource>(
    resource: Name,
    filter: Filter,
    { revision, context }: { revision: string | undefined; context: Json },
  ) {
    try {
      const [row] = await this.sql<{ rows: Json }[]>`
        select public.thamba_scoped_repository_list(
          ${resource}, ${this.sql.json(toFilterJson(filter))}, ${revision ?? null}, ${this.sql.json(context)}
        ) as rows
      `;
      if (!Array.isArray(row?.rows)) throw new StorageFailure(undefined);
      return row.rows as Row<Name>[];
    } catch (error) {
      throw toStorageFailure(error);
    }
  }

  async save(write: RowWrite): Promise<WriteResult> {
    try {
      await this.commit([write]);
      return SAVED;
    } catch (error) {
      return getWriteFailure(error);
    }
  }

  async commit(
    writes: readonly RowWrite[],
    revision?: string,
    scope?: CommandScope,
  ): Promise<void> {
    const context = createWriteContext(writes, scope, await this.actors.getActor());
    if (!context) throw new StorageFailure('42501');
    try {
      await this.sql`
        select public.thamba_scoped_repository_commit(
          ${this.sql.json(toWriteBatch(writes))}, ${revision ?? null}, ${this.sql.json(context)}
        )
      `;
    } catch (error) {
      throw toStorageFailure(error);
    }
  }
}

function toStorageFailure(error: unknown): StorageFailure {
  if (error instanceof StorageFailure) return error;
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  return new StorageFailure(code);
}
