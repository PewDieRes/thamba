import type { WriteResult } from '@application/ports/application-result';
import type { CommandScope } from './command-scope';
import { toFilterJson, toWriteBatch } from './unit-of-work.mapper';
import {
  type Client,
  type Filter,
  type Resource,
  type Row,
  type RepositoryStorage,
  type RowWrite,
  getWriteFailure,
  SAVED,
  StorageFailure,
} from './repository-storage';

export class SupabaseStorage implements RepositoryStorage {
  constructor(
    private readonly client: Client,
    private readonly commandScope?: CommandScope,
  ) {}

  async getRevision(): Promise<string> {
    const { data, error } = await this.client.rpc('thamba_repository_revision');
    if (error) throw new StorageFailure(error.code);
    return data;
  }

  async list<Name extends Resource>(
    resource: Name,
    filter: Filter,
    revision?: string,
  ): Promise<Row<Name>[]> {
    const { data, error } = await this.client.rpc('thamba_repository_list', {
      resource_name: resource,
      filters: toFilterJson(filter),
      ...(revision === undefined ? {} : { expected_revision: revision }),
    });
    if (error || !Array.isArray(data)) throw new StorageFailure(error?.code);
    return data as Row<Name>[];
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
    observedScope?: CommandScope,
  ): Promise<void> {
    const commandScope = this.commandScope ?? observedScope;
    const { error } = await this.client.rpc('thamba_repository_commit', {
      writes: toWriteBatch(writes),
      ...(revision === undefined ? {} : { expected_revision: revision }),
      ...(commandScope === undefined
        ? {}
        : {
            command_scope: { town_id: commandScope.town_id, demo_run_id: commandScope.demo_run_id },
          }),
    });
    if (error) throw new StorageFailure(error.code);
  }
}
