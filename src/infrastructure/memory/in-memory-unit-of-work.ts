import type { ApplicationResult } from '@application/ports/application-result';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { MemoryStore } from './memory-store';

export class InMemoryUnitOfWork implements UnitOfWork {
  #store = new MemoryStore();

  constructor(private readonly createTransaction: (store: MemoryStore) => Transaction) {}

  async run<T>(
    work: (transaction: Transaction) => Promise<ApplicationResult<T>>,
  ): Promise<ApplicationResult<T>> {
    const snapshot = this.#store;
    const staged = snapshot.fork();
    try {
      const result = await work(this.createTransaction(staged));
      if (!result.ok || !staged.hasChanges) return result;
      if (this.#store !== snapshot) return { ok: false, error: { code: 'ConcurrencyConflict' } };
      this.#store = staged;
      return result;
    } catch {
      return { ok: false, error: { code: 'storage_unavailable' } };
    } finally {
      staged.seal();
    }
  }
}
