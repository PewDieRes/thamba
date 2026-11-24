import type { DomainError } from '../shared/domain.error';
import type { LandmarkId, RiderId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { getKolkataMinuteOfDay } from '../shared/kolkata-time';
import type { Money } from '../shared/money.value-object';
import { PassengerCount } from '../shared/passenger-count.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import { evaluateBookingCapability } from '../town/town';
import type { BookingContext, BookingScope, InformationOnly, Town } from '../town/town';
import type { FareChart, NightWindow, Route, RouteFare } from './fare-chart';

type DemoRun = Required<BookingScope>;

interface QuoteFareInput {
  readonly town: Town;
  readonly chart: FareChart;
  readonly riderId: RiderId;
  readonly demoRun?: DemoRun | undefined;
  readonly pickupLandmarkId: LandmarkId;
  readonly destinationLandmarkId: LandmarkId;
  readonly passengers: unknown;
  readonly expiresAt: Instant;
  readonly pickupAt?: Instant;
}

export interface FareQuote {
  readonly riderId: RiderId;
  readonly scope: BookingScope;
  readonly route: Route;
  readonly passengers: PassengerCount;
  readonly amount: Money;
  readonly isNight: boolean;
  readonly chartVersion: number;
  readonly expiresAt: Instant;
}

export type FareError = DomainError<
  'NO_ROUTE' | 'SAME_LANDMARK' | 'INVALID_PASSENGERS' | 'TOWN_NOT_BOOKABLE'
>;

export function quoteFare(input: QuoteFareInput, now: Instant): Result<FareQuote, FareError> {
  const { town, chart, demoRun, expiresAt, pickupLandmarkId, destinationLandmarkId } = input;
  const scope = getQuoteScope(evaluateBookingCapability(town, now), demoRun);
  const minute = getKolkataMinuteOfDay((input.pickupAt ?? now).epochMilliseconds);
  if (!scope || minute === undefined || !now.isBefore(expiresAt))
    return err({ code: 'TOWN_NOT_BOOKABLE' });
  if (pickupLandmarkId === destinationLandmarkId) return err({ code: 'SAME_LANDMARK' });

  const passengers = PassengerCount.fromCount(input.passengers);
  if (!passengers.ok) return err({ code: 'INVALID_PASSENGERS' });

  const routeFare = findRouteFare(input);
  if (!routeFare) return err({ code: 'NO_ROUTE' });

  const isNight = isNightMinute(chart.nightWindow, minute);
  return ok(
    Object.freeze({
      riderId: input.riderId,
      scope: Object.freeze(scope),
      route: Object.freeze({ ...routeFare.route }),
      passengers: passengers.value,
      amount: isNight ? routeFare.nightFare : routeFare.fare,
      isNight,
      chartVersion: chart.version,
      expiresAt,
    }),
  );
}

function getQuoteScope(
  context: BookingContext | InformationOnly,
  demoRun: DemoRun | undefined,
): BookingScope | undefined {
  if (context.kind === 'information_only') return undefined;
  const { townId } = context;
  if (context.kind === 'live') return demoRun === undefined ? { townId } : undefined;
  if (demoRun?.townId === townId) return { townId, demoRunId: demoRun.demoRunId };
  return undefined;
}

function findRouteFare(input: QuoteFareInput): RouteFare | undefined {
  const { chart, town, pickupLandmarkId, destinationLandmarkId } = input;
  if (chart.townId !== town.townId) return undefined;
  return chart.routes.find(
    ({ route }) =>
      route.pickupLandmarkId === pickupLandmarkId &&
      route.destinationLandmarkId === destinationLandmarkId,
  );
}

function isNightMinute(window: NightWindow, minute: number): boolean {
  const { startMinuteOfDay, endMinuteOfDay } = window;
  if (startMinuteOfDay <= endMinuteOfDay) {
    return minute >= startMinuteOfDay && minute < endMinuteOfDay;
  }
  return minute >= startMinuteOfDay || minute < endMinuteOfDay;
}
