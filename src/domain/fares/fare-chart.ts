import type { LandmarkId, RouteId, TownId } from '../shared/ids.value-object';
import type { Money } from '../shared/money.value-object';

export interface Route {
  readonly routeId: RouteId;
  readonly pickupLandmarkId: LandmarkId;
  readonly destinationLandmarkId: LandmarkId;
}

export interface RouteFare {
  readonly route: Route;
  readonly fare: Money;
  readonly nightFare: Money;
}

export interface NightWindow {
  readonly startMinuteOfDay: number;
  readonly endMinuteOfDay: number;
}

export interface FareChart {
  readonly isIllustrative?: boolean;
  readonly townId: TownId;
  readonly version: number;
  readonly routes: readonly RouteFare[];
  readonly nightWindow: NightWindow;
}
