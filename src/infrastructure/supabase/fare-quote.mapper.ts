import type { StoredFareQuote } from '@application/ports/fare-quote-repository';
import type { FareQuote } from '@domain/fares/quote-fare';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';
import {
  readInstant,
  readOptionalInstant,
  readRoute,
  readScope,
  unpack,
  versioned,
  writeInstant,
  writeRoute,
  writeScope,
  type RouteRow,
} from './row.mapper';

export type FareQuoteRow = Pick<
  Tables<'fare_quotes'>,
  | 'id'
  | 'town_id'
  | 'demo_run_id'
  | 'rider_user_id'
  | 'chart_version'
  | 'fare_in_paise'
  | 'passenger_count'
  | 'is_night'
  | 'pickup_at'
  | 'expires_at'
  | 'version'
> &
  RouteRow;

export function fromFareQuoteRow(row: FareQuoteRow, domain: DomainValues) {
  return versioned<StoredFareQuote>(row, {
    quoteId: row.id as StoredFareQuote['quoteId'],
    ...readOptionalInstant('pickupAt', row.pickup_at, domain),
    quote: {
      scope: readScope(row.town_id, row.demo_run_id),
      riderId: row.rider_user_id as FareQuote['riderId'],
      route: readRoute(row),
      amount: unpack(domain.money(row.fare_in_paise)),
      passengers: unpack(domain.passengers(row.passenger_count, row.passenger_count)),
      chartVersion: row.chart_version,
      isNight: row.is_night,
      expiresAt: readInstant(row.expires_at, domain),
    },
  });
}

export function toFareQuoteRow({
  quoteId,
  quote,
  pickupAt,
}: StoredFareQuote): Omit<FareQuoteRow, 'version'> {
  return {
    ...writeScope(quote.scope),
    ...writeRoute(quote.route),
    id: quoteId,
    rider_user_id: quote.riderId,
    chart_version: quote.chartVersion,
    fare_in_paise: quote.amount.paise,
    passenger_count: quote.passengers.count,
    is_night: quote.isNight,
    pickup_at: writeInstant(pickupAt),
    expires_at: new Date(quote.expiresAt.epochMilliseconds).toISOString(),
  };
}
