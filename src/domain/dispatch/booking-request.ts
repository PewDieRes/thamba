import type { Duration } from '../shared/duration.value-object';
import type { BookingId, RiderId, StandId } from '../shared/ids.value-object';
import { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import type {
  BookingFare,
  BookingScope,
  BookingState,
  BookingTransitionError,
} from './booking-state';
import { captureConfiguredNeighbourOrder } from './configured-neighbour-order.policy';
import type { StandFallbackPolicy } from './stand-fallback.policy';

const DEFAULT_LEAD_TIME_MILLISECONDS = 1_200_000;
const DEFAULT_DISPATCH_DURATION_MILLISECONDS = 90_000;

interface BookingQuote {
  readonly riderId: RiderId;
  readonly scope: BookingScope;
  readonly fare: BookingFare;
  readonly expiresAt: Instant;
}

export interface BookingAuthority {
  readonly canBook: boolean;
}

interface BookingConfirmation extends BookingAuthority {
  readonly bookingId: BookingId;
  readonly riderId: RiderId;
  readonly scope: BookingScope;
  readonly standId: StandId;
  readonly quote: BookingQuote;
  readonly currentFareChartVersion: number;
}

export interface DispatchSettings {
  readonly dispatchDuration?: Duration;
  readonly alternateStandIds?: readonly StandId[];
  readonly maxSearchStands?: number;
  readonly standFallback?: StandFallbackPolicy;
}

export interface RequestBookingInput extends BookingConfirmation, DispatchSettings {}

export interface ScheduleBookingInput extends BookingConfirmation {
  readonly pickupAt: Instant;
  readonly leadTime?: Duration;
}

type ConfirmedBooking = Pick<
  BookingState,
  'bookingId' | 'riderId' | 'townId' | 'demoRunId' | 'standId' | 'fare'
>;

export function confirmBooking(
  input: BookingConfirmation,
  now: Instant,
): Result<ConfirmedBooking, BookingTransitionError> {
  const { bookingId, riderId, scope, standId, quote } = input;
  const { townId, demoRunId } = scope;
  if (
    quote.riderId !== riderId ||
    quote.scope.townId !== townId ||
    quote.scope.demoRunId !== demoRunId
  ) {
    return err({ code: 'quote_scope_mismatch' });
  }
  if (
    now.isAtOrAfter(quote.expiresAt) ||
    quote.fare.fareChartVersion !== input.currentFareChartVersion
  ) {
    return err({ code: 'stale_quote' });
  }
  if (!input.canBook) return err({ code: 'booking_unavailable' });

  const { amount, fareChartVersion, route } = quote.fare;
  const { routeId, pickupLandmarkId, destinationLandmarkId } = route;
  const fare = Object.freeze({
    amount,
    fareChartVersion,
    route: Object.freeze({ routeId, pickupLandmarkId, destinationLandmarkId }),
  });
  return ok({
    bookingId,
    riderId,
    townId,
    standId,
    fare,
    ...(demoRunId === undefined ? {} : { demoRunId }),
  });
}

export function getSchedule(
  input: ScheduleBookingInput,
  now: Instant,
): Result<{ pickupAt: Instant; requestDueAt: Instant }, BookingTransitionError> {
  if (!now.isBefore(input.pickupAt)) return err({ code: 'pickup_not_in_future' });

  const leadTimeMilliseconds = input.leadTime?.milliseconds ?? DEFAULT_LEAD_TIME_MILLISECONDS;
  const due = Instant.fromEpochMilliseconds(
    input.pickupAt.epochMilliseconds - leadTimeMilliseconds,
  );
  if (!due.ok) return err({ code: 'invalid_request_due_at' });

  return ok({ pickupAt: input.pickupAt, requestDueAt: due.value });
}

export function getDispatchWindow(
  standId: StandId,
  settings: DispatchSettings,
  now: Instant,
): Result<DispatchWindow, BookingTransitionError> {
  const durationMilliseconds =
    settings.dispatchDuration?.milliseconds ?? DEFAULT_DISPATCH_DURATION_MILLISECONDS;
  const deadline = Instant.fromEpochMilliseconds(now.epochMilliseconds + durationMilliseconds);
  if (durationMilliseconds === 0 || !deadline.ok) return err({ code: 'invalid_dispatch_deadline' });

  const search = {
    originalStandId: standId,
    neighbourStandIds: settings.alternateStandIds ?? [],
    ...(settings.maxSearchStands === undefined
      ? {}
      : { maxSearchStands: settings.maxSearchStands }),
  };
  const captured = settings.standFallback
    ? settings.standFallback.capture(search)
    : captureConfiguredNeighbourOrder(search);
  if (!captured.ok) return captured;

  return ok({
    requestedAt: now,
    dispatchDeadline: deadline.value,
    searchStandIds: Object.freeze([...captured.value]),
  });
}

interface DispatchWindow {
  readonly requestedAt: Instant;
  readonly dispatchDeadline: Instant;
  readonly searchStandIds: readonly StandId[];
}

export function isScheduleDue(state: BookingState, now: Instant): boolean {
  return state.requestDueAt !== undefined && now.isAtOrAfter(state.requestDueAt);
}

export function getDispatchBlock(
  state: BookingState,
  authority: BookingAuthority,
  now: Instant,
): 'dispatch_deadline' | 'booking_unavailable' | undefined {
  if (state.dispatchDeadline !== undefined && now.isAtOrAfter(state.dispatchDeadline)) {
    return 'dispatch_deadline';
  }
  return authority.canBook ? undefined : 'booking_unavailable';
}
