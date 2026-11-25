import type {
  FareQuoteRepository,
  StoredFareQuote,
} from '@application/ports/fare-quote-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { FareQuoteId } from '@domain/shared/ids.value-object';
import type { DomainValues } from './domain-values';
import { fromFareQuoteRow, toFareQuoteRow } from './fare-quote.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseFareQuoteRepository implements FareQuoteRepository {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: DomainValues,
  ) {}

  async get(id: FareQuoteId) {
    const row = await getRow(this.storage, 'quotes', { id: id });
    return row && fromFareQuoteRow(row, this.domain);
  }

  save(value: StoredFareQuote, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'quotes',
      key: { id: value.quoteId },
      row: toFareQuoteRow(value),
      expectedVersion,
    });
  }
}
