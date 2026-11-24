import type { FareQuoteRepository } from '@application/ports/fare-quote-repository';
import { DEADLINE, QUOTE, QUOTE_ID } from './contract-data.fixtures';
import { type AdapterFactory, versionedRepositoryContract } from './versioned-repository.fixtures';

export function fareQuoteRepositoryContract(make: AdapterFactory<FareQuoteRepository>) {
  versionedRepositoryContract({
    name: 'FareQuoteRepository',
    make,
    id: QUOTE_ID,
    first: { quote: QUOTE, quoteId: QUOTE_ID },
    updated: { quote: QUOTE, quoteId: QUOTE_ID, pickupAt: DEADLINE },
  });
}
