import type { FareChart } from '@domain/fares/fare-chart';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';
import { readRoute, unpack, versioned, writeRoute, type RouteRow } from './row.mapper';

type RouteFareRow = RouteRow &
  Pick<Tables<'fare_routes'>, 'day_fare_in_paise' | 'night_fare_in_paise'>;
export type FareChartRow = Pick<
  Tables<'fare_charts'>,
  'town_id' | 'chart_version' | 'night_start_minute' | 'night_end_minute' | 'version'
> & { route_fares: RouteFareRow[]; is_illustrative?: boolean };

export function fromFareChartRow(row: FareChartRow, domain: DomainValues) {
  return versioned<FareChart>(row, {
    townId: row.town_id as FareChart['townId'],
    version: row.chart_version,
    ...(row.is_illustrative ? { isIllustrative: true } : {}),
    nightWindow: {
      startMinuteOfDay: row.night_start_minute,
      endMinuteOfDay: row.night_end_minute,
    },
    routes: row.route_fares.map((fare) => ({
      route: readRoute(fare),
      fare: unpack(domain.money(fare.day_fare_in_paise)),
      nightFare: unpack(domain.money(fare.night_fare_in_paise)),
    })),
  });
}

export function toFareChartRow(value: FareChart): Omit<FareChartRow, 'version'> {
  return {
    town_id: value.townId,
    chart_version: value.version,
    ...(value.isIllustrative === undefined ? {} : { is_illustrative: value.isIllustrative }),
    night_start_minute: value.nightWindow.startMinuteOfDay,
    night_end_minute: value.nightWindow.endMinuteOfDay,
    route_fares: value.routes.map(({ route, fare, nightFare }) => ({
      ...writeRoute(route),
      day_fare_in_paise: fare.paise,
      night_fare_in_paise: nightFare.paise,
    })),
  };
}
