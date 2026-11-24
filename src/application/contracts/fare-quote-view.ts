import type { Route } from '@domain/fares/fare-chart';
import type { FareQuoteId } from '@domain/shared/ids.value-object';

export interface FareQuoteView {
  readonly quoteId: FareQuoteId;
  readonly route: Route;
  readonly fareInPaise: number;
  readonly fareChartVersion: number;
  readonly expiresAtEpochMilliseconds: number;
  readonly isNight: boolean;
}
