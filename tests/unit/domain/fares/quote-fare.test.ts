import { expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import type { FareChart } from '@domain/fares/fare-chart';
import { quoteFare } from '@domain/fares/quote-fare';
import { createLicence } from '@domain/town/licence';
import { Town } from '@domain/town/town';
import * as f from '../dispatch/booking.fixtures';

const route = { ...f.route };
const routeFare = { route, fare: f.money(8_000), nightFare: f.money(10_000) };
const chart = {
  townId: f.townId,
  version: 7,
  nightWindow: { startMinuteOfDay: 22 * 60, endMinuteOfDay: 5 * 60 },
  routes: [routeFare],
} satisfies FareChart;
const town = Town.create({ townId: f.townId, simulationProfile: { kind: 'synthetic' } });
const at = (dateTime: string) => f.at(Date.parse(dateTime));
const input = {
  ...route,
  town,
  chart,
  riderId: f.riderId,
  demoRun: { townId: f.townId, demoRunId: f.demoRunId },
  passengers: 2,
  expiresAt: at('2026-11-25T00:00:00Z'),
};
const now = at('2026-11-24T12:00:00Z');

it.each([
  ['excludes the minute before the start', '2026-11-24T16:29:00Z', false, 8_000],
  ['includes the start minute', '2026-11-24T16:30:00Z', true, 10_000],
  ['includes midnight', '2026-11-24T18:30:00Z', true, 10_000],
  ['includes the minute before the end', '2026-11-24T23:29:00Z', true, 10_000],
  ['excludes the end minute', '2026-11-24T23:30:00Z', false, 8_000],
] as const)('night window %s in IST', (_label, utcTime, isNight, paise) => {
  const quote = f.unwrap(quoteFare(input, at(utcTime)));
  expect(quote.isNight).toBe(isNight);
  expect(quote.amount.paise).toBe(paise);
});

it.each([
  ['2026-11-24T04:29:00Z', false],
  ['2026-11-24T04:30:00Z', true],
  ['2026-11-24T06:29:00Z', true],
  ['2026-11-24T06:30:00Z', false],
] as const)('evaluates a window within one IST day at %s', (utcTime, isNight) => {
  const dayWindow = { startMinuteOfDay: 10 * 60, endMinuteOfDay: 12 * 60 };
  const quote = f.unwrap(
    quoteFare({ ...input, chart: { ...chart, nightWindow: dayWindow } }, at(utcTime)),
  );
  expect(quote.isNight).toBe(isNight);
});

it('uses an empty night window for equal endpoints', () => {
  const nightWindow = { startMinuteOfDay: 22 * 60, endMinuteOfDay: 22 * 60 };
  const utcTime = at('2026-11-24T16:30:00Z');
  const quote = f.unwrap(quoteFare({ ...input, chart: { ...chart, nightWindow } }, utcTime));
  expect(quote.isNight).toBe(false);
});

it('captures the chart version, ordered Route, fixed fare, owner, scope and expiry', () => {
  const mutableRoute = { ...route };
  const mutableChart = { ...chart, routes: [{ ...routeFare, route: mutableRoute }] };
  const quote = f.unwrap(quoteFare({ ...input, chart: mutableChart }, now));
  mutableChart.version += 1;
  mutableRoute.destinationLandmarkId = route.pickupLandmarkId;
  expect(quote).toMatchObject({
    route,
    chartVersion: 7,
    passengers: { count: 2 },
    amount: { paise: 8_000 },
    riderId: f.riderId,
    scope: input.demoRun,
  });
  expect(quote.expiresAt).toBe(input.expiresAt);
  expect(f.unwrap(quoteFare({ ...input, passengers: 3 }, now)).amount.paise).toBe(8_000);
});

it('prices a scheduled pickup using its local minute', () => {
  const pickupAt = at('2026-11-24T16:30:00Z');
  expect(f.unwrap(quoteFare({ ...input, pickupAt }, now)).amount.paise).toBe(10_000);
});

it('rejects quotation at the requested expiry instant', () => {
  expect(quoteFare({ ...input, expiresAt: now }, now)).toEqual({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
});

it('confirms the quoted terms and rejects an expired or superseded quote', () => {
  const quote = f.unwrap(quoteFare(input, now));
  const fare = { route: quote.route, amount: quote.amount, fareChartVersion: quote.chartVersion };
  const confirmation = {
    ...f.request,
    scope: quote.scope,
    quote: { riderId: quote.riderId, scope: quote.scope, expiresAt: quote.expiresAt, fare },
    currentFareChartVersion: chart.version,
  };
  const { booking } = f.unwrap(Booking.request(confirmation, now));
  expect(booking.state.fare).toEqual(fare);
  const stale = { ok: false, error: { code: 'stale_quote' } };
  expect(Booking.request(confirmation, quote.expiresAt)).toEqual(stale);
  expect(
    Booking.request({ ...confirmation, currentFareChartVersion: chart.version + 1 }, now),
  ).toEqual(stale);
});

it.each([0, 4, 1.5, '2'])('returns INVALID_PASSENGERS for %s', (passengers) => {
  expect(quoteFare({ ...input, passengers }, now)).toEqual({
    ok: false,
    error: { code: 'INVALID_PASSENGERS' },
  });
});

it('returns SAME_LANDMARK for identical pickup and destination', () => {
  expect(quoteFare({ ...input, destinationLandmarkId: route.pickupLandmarkId }, now)).toEqual({
    ok: false,
    error: { code: 'SAME_LANDMARK' },
  });
});

it('returns NO_ROUTE when only the reverse fare exists', () => {
  const reverse = {
    pickupLandmarkId: route.destinationLandmarkId,
    destinationLandmarkId: route.pickupLandmarkId,
  };
  expect(quoteFare({ ...input, ...reverse }, now)).toEqual({
    ok: false,
    error: { code: 'NO_ROUTE' },
  });
});

it('returns NO_ROUTE for another Town’s Fare chart', () => {
  const otherChart = { ...chart, townId: f.otherTownId };
  expect(quoteFare({ ...input, chart: otherChart }, now)).toEqual({
    ok: false,
    error: { code: 'NO_ROUTE' },
  });
});

it('returns TOWN_NOT_BOOKABLE for Malvan or a simulation without a matching run', () => {
  const otherRun = { ...input.demoRun, townId: f.otherTownId };
  const unlicensed = Town.create({ townId: f.townId });
  expect(quoteFare({ ...input, town: unlicensed }, now)).toEqual({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
  expect(quoteFare({ ...input, demoRun: otherRun }, now)).toEqual({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
  expect(quoteFare({ ...input, demoRun: undefined }, now)).toEqual({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
});

it('quotes live within the Town licence window and rejects quotation at expiry', () => {
  const licence = f.unwrap(
    createLicence({
      ulin: 'TEST-ULIN',
      issuingAuthority: 'Test Authority',
      validFromDate: '2026-11-24',
      validThroughDate: '2026-11-24',
    }),
  );
  const live = f.unwrap(Town.create({ townId: f.townId, licence }).withBookingMode('live', now));
  const liveInput = { ...input, town: live, demoRun: undefined };
  expect(f.unwrap(quoteFare(liveInput, now)).scope).toEqual({ townId: f.townId });
  expect(quoteFare({ ...liveInput, demoRun: input.demoRun }, now)).toEqual({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
  expect(quoteFare(liveInput, at('2026-11-24T18:30:00Z'))).toEqual({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
});
