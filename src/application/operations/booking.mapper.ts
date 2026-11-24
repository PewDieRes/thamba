import type { Booking } from '@domain/dispatch/booking';
import type { FareChart } from '@domain/fares/fare-chart';
import type { FareQuoteView } from '../contracts/fare-quote-view';
import type { StoredFareQuote } from '../ports/fare-quote-repository';

export function mapBookingProgress({ state }: Booking) {
  return {
    bookingId: state.bookingId,
    status: state.status,
    ...(state.noDriverFoundReason === undefined
      ? {}
      : { noDriverFoundReason: state.noDriverFoundReason }),
  };
}

export function mapFareQuote({ quoteId, quote }: StoredFareQuote): FareQuoteView {
  return {
    quoteId,
    route: quote.route,
    fareInPaise: quote.amount.paise,
    fareChartVersion: quote.chartVersion,
    expiresAtEpochMilliseconds: quote.expiresAt.epochMilliseconds,
    isNight: quote.isNight,
  };
}

export function mapFareTerms(quote: StoredFareQuote['quote']) {
  return { route: quote.route, amount: quote.amount, fareChartVersion: quote.chartVersion };
}

export function mapFareChart(chart: FareChart | undefined) {
  return (
    chart?.routes.map(({ route, fare, nightFare }) => ({
      route,
      fareInPaise: fare.paise,
      nightFareInPaise: nightFare.paise,
    })) ?? []
  );
}
