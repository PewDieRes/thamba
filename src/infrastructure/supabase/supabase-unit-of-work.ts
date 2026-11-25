import type { ApplicationResult } from '@application/ports/application-result';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { getWriteFailure, UNAVAILABLE } from './repository-storage';
import { StagedStorage } from './staged-storage';
import type { SupabaseStorage } from './supabase-storage';

export class SupabaseUnitOfWork implements UnitOfWork {
  constructor(
    private readonly storage: SupabaseStorage,
    private readonly createTransaction: (storage: StagedStorage) => Transaction,
  ) {}

  async run<T>(
    work: (transaction: Transaction) => Promise<ApplicationResult<T>>,
  ): Promise<ApplicationResult<T>> {
    let staged: StagedStorage | undefined;
    try {
      staged = new StagedStorage(this.storage, await this.storage.getRevision());
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
