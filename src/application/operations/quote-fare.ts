import { quoteFare } from '@domain/fares/quote-fare';
import type { FareChart } from '@domain/fares/fare-chart';
import type { LandmarkId, RiderId } from '@domain/shared/ids.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { BookingScope } from '@domain/town/town';
import type { FareQuoteRepository } from '../ports/fare-quote-repository';
import type { IdGenerator } from '../ports/id-generator';
import type { TownRecord } from '../ports/town-repository';
import { canBookTown } from './booking-authority';
import { mapFareQuote } from './booking.mapper';

const QUOTE_TTL_MILLISECONDS = 300_000;

interface QuoteRequest extends BookingScope {
  readonly riderId: RiderId;
  readonly pickupLandmarkId: LandmarkId;
  readonly destinationLandmarkId: LandmarkId;
  readonly passengers: number;
  readonly pickupAt?: Instant;
}

export async function issueFareQuote(
  request: QuoteRequest,
  { town, chart, now }: { town: TownRecord; chart: FareChart; now: Instant },
  { ids, quotes }: { ids: IdGenerator; quotes: FareQuoteRepository },
) {
  if (!canBookTown(town, request, now)) return err({ code: 'TOWN_NOT_BOOKABLE' as const });
  if (request.pickupAt && !now.isBefore(request.pickupAt)) {
    return err({ code: 'pickup_not_in_future' as const });
  }
  const expiresAt = Instant.fromEpochMilliseconds(now.epochMilliseconds + QUOTE_TTL_MILLISECONDS);
  if (!expiresAt.ok) return err({ code: 'invalid_expiry' as const });
  const { demoRunId, ...input } = request;
  const quote = quoteFare(
    {
      ...input,
      town: town.town,
      chart,
      expiresAt: expiresAt.value,
      ...(demoRunId === undefined ? {} : { demoRun: { townId: input.townId, demoRunId } }),
    },
    now,
  );
  if (!quote.ok) return quote;
  const record = {
    quoteId: ids.next<'FareQuote'>(),
    quote: quote.value,
    ...(request.pickupAt === undefined ? {} : { pickupAt: request.pickupAt }),
  };
  const saved = await quotes.save(record, null);
  return saved.ok ? ok(mapFareQuote(record)) : saved;
}
