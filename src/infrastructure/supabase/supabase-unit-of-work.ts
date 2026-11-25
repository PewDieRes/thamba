import type { RepositoryAccess } from '@application/ports/repository-access';
import type { ApplicationResult } from '@application/ports/application-result';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { getWriteFailure, UNAVAILABLE } from './repository-storage';
import { StagedStorage } from './staged-storage';
import type { RepositoryBackend } from './repository-storage';

export class SupabaseUnitOfWork implements UnitOfWork {
  constructor(
    private readonly storage: RepositoryBackend,
    private readonly createTransaction: (storage: StagedStorage) => Transaction,
  ) {}

  async run<T>(
    work: (transaction: Transaction) => Promise<ApplicationResult<T>>,
    access?: RepositoryAccess,
  ): Promise<ApplicationResult<T>> {
    let staged: StagedStorage | undefined;
    try {
      const revision = await this.storage.getRevision();
      const reader = this.storage.openReader
        ? await this.storage.openReader(access)
        : this.storage.list.bind(this.storage);
      staged = new StagedStorage(this.storage, revision, reader);
      const result = await work(this.createTransaction(staged));
      if (result.ok) await staged.commit();
      return result;
    } catch (error) {
      const failure = getWriteFailure(error);
      return failure.ok ? UNAVAILABLE : failure;
    } finally {
      staged?.close();
    }
  }
}
