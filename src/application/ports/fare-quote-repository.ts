import type { FareQuote } from '@domain/fares/quote-fare';
import type { FareQuoteId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';

export interface StoredFareQuote {
  readonly quoteId: FareQuoteId;
  readonly quote: FareQuote;
  readonly pickupAt?: Instant;
}

import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface FareQuoteRepository {
  get(id: FareQuoteId): Promise<Versioned<StoredFareQuote> | undefined>;
  save(value: StoredFareQuote, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
