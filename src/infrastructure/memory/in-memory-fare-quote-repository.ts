import type { FareQuoteId } from '@domain/shared/ids.value-object';
import type {
  FareQuoteRepository,
  StoredFareQuote,
} from '@application/ports/fare-quote-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryFareQuoteRepository implements FareQuoteRepository {
  constructor(private readonly table = new MemoryTable<StoredFareQuote>()) {}

  get(id: FareQuoteId) {
    return Promise.resolve(this.table.get(id));
  }

  save(value: StoredFareQuote, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.quoteId;
    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
