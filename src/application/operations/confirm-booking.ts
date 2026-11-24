import { Booking } from '@domain/dispatch/booking';
import type { StandFallbackPolicy } from '@domain/dispatch/stand-fallback.policy';
import type { FareQuoteId, RiderId, StandId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { IdGenerator } from '../ports/id-generator';
import type { Transaction } from '../ports/unit-of-work';
import { canBookTown, getDispatchSettings, servesPickup } from './booking-authority';
import { mapBookingProgress, mapFareTerms } from './booking.mapper';
import { commit, rejectAfterCommit } from './execute-command';
import { issueFareQuote } from './quote-fare';
import { saveBookingDecision } from './save-booking-decision';

interface Confirmation {
  readonly quoteId: FareQuoteId;
  readonly riderId: RiderId;
  readonly standId: StandId;
}

interface ConfirmationOptions {
  readonly ids: IdGenerator;
  readonly now: Instant;
  readonly mode: 'immediate' | 'scheduled';
  readonly standFallback: StandFallbackPolicy;
}

export async function confirmRide(
  tx: Transaction,
  input: Confirmation,
  options: ConfirmationOptions,
) {
  const context = await loadConfirmation(tx, input);
  if (!context.ok) return context;
  const { stored, town, chart } = context.value;
  const { quote, pickupAt } = stored;
  const { ids, now, mode } = options;
  if ((mode === 'scheduled') !== (pickupAt !== undefined))
    return err({ code: 'quote_pickup_mismatch' as const });
  if (!canBookTown(town, { ...quote.scope, riderId: quote.riderId }, now))
    return err({ code: 'booking_unavailable' as const });
  if (now.isAtOrAfter(quote.expiresAt) || quote.chartVersion !== chart.version) {
    return refreshQuote(tx, context.value, options);
  }
  const decision = await decideBooking(tx.stands, context.value, options);
  if (!decision.ok) return decision;
  const saved = await saveBookingDecision(tx, decision.value, { expectedVersion: null, ids });
  return saved.ok ? commit(mapBookingProgress(decision.value.booking)) : saved;
}

async function loadConfirmation(tx: Transaction, input: Confirmation) {
  const stored = (await tx.quotes.get(input.quoteId))?.value;
  if (stored?.quote.riderId !== input.riderId) return err({ code: 'not_found' as const });
  const { quote } = stored;
  const { scope } = quote;
  const town = (await tx.towns.get(scope.townId))?.value;
  const chart = (await tx.fareCharts.get(scope.townId))?.value;
  const stand = (await tx.stands.get(input.standId))?.value;
  if (!town || !chart || !servesPickup(stand, scope, quote.route.pickupLandmarkId)) {
    return err({ code: 'not_found' as const });
  }
  return ok({ stored, town, chart, stand });
}

type ConfirmationContext = Extract<
  Awaited<ReturnType<typeof loadConfirmation>>,
  { ok: true }
>['value'];

async function refreshQuote(
  { quotes }: Transaction,
  { stored: { quote, pickupAt }, town, chart }: ConfirmationContext,
  { now, ids }: ConfirmationOptions,
) {
  const fresh = await issueFareQuote(
    {
      ...quote.scope,
      ...quote.route,
      riderId: quote.riderId,
      passengers: quote.passengers.count,
      ...(pickupAt === undefined ? {} : { pickupAt }),
    },
    { town, chart, now },
    { ids, quotes },
  );
  return fresh.ok ? rejectAfterCommit({ code: 'stale_quote', freshQuote: fresh.value }) : fresh;
}

async function decideBooking(
  stands: Transaction['stands'],
  { stored: { quote, pickupAt }, town, chart, stand }: ConfirmationContext,
  { now, ids, standFallback }: ConfirmationOptions,
) {
  const confirmation = {
    bookingId: ids.next<'Booking'>(),
    riderId: quote.riderId,
    scope: quote.scope,
    standId: stand.standId,
    quote: { ...quote, fare: mapFareTerms(quote) },
    currentFareChartVersion: chart.version,
    canBook: true,
  };
  if (pickupAt !== undefined) {
    const leadTime = town.scheduleLeadTime;
    return Booking.schedule(
      { ...confirmation, pickupAt, ...(leadTime === undefined ? {} : { leadTime }) },
      now,
    );
  }
  const settings = await getDispatchSettings(
    stands,
    { stand, town, pickupId: quote.route.pickupLandmarkId },
    standFallback,
  );
  return Booking.request({ ...confirmation, ...settings }, now);
}
