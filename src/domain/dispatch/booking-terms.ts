import type { Route } from '../fares/fare-chart';
import type { Money } from '../shared/money.value-object';

export interface BookingFare {
  readonly route: Route;
  readonly amount: Money;
  readonly fareChartVersion: number;
}
