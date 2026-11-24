import { expect, it } from 'vitest';
import { createLicence } from '@domain/town/licence';
import { evaluateBookingCapability, Town } from '@domain/town/town';
import { at, townId, unwrap } from '../dispatch/booking.fixtures';

const dates = {
  ulin: 'TEST-ULIN',
  issuingAuthority: 'Test Authority',
  validFromDate: '2026-11-24',
  validThroughDate: '2026-11-25',
};
const startsAt = at(Date.parse('2026-11-23T18:30:00.000Z'));
const endsAt = at(Date.parse('2026-11-25T18:30:00.000Z'));
const licence = unwrap(createLicence(dates));
const licensedTown = Town.create({ townId, licence });

it('includes the start at midnight IST and excludes the preceding millisecond', () => {
  expect(licence.startsAt.epochMilliseconds).toBe(startsAt.epochMilliseconds);
  expect(licensedTown.withBookingMode('live', at(startsAt.epochMilliseconds - 1))).toEqual({
    ok: false,
    error: { code: 'licence_not_yet_valid' },
  });
  const live = unwrap(licensedTown.withBookingMode('live', startsAt));
  expect(evaluateBookingCapability(live, startsAt)).toEqual({
    kind: 'live',
    townId,
    ulin: dates.ulin,
  });
});

it('includes the final millisecond and excludes the following midnight IST', () => {
  expect(licence.endsAt.epochMilliseconds).toBe(endsAt.epochMilliseconds);
  const lastValidInstant = at(endsAt.epochMilliseconds - 1);
  const live = unwrap(licensedTown.withBookingMode('live', lastValidInstant));
  expect(evaluateBookingCapability(live, lastValidInstant)).toMatchObject({ kind: 'live' });
  expect(evaluateBookingCapability(live, endsAt)).toEqual({
    kind: 'information_only',
    reason: 'licence_expired',
  });
  expect(live.withBookingMode('live', endsAt)).toEqual({
    ok: false,
    error: { code: 'licence_expired' },
  });
});

it('rejects setting live mode without a licence, including for a synthetic Town', () => {
  const simulationProfile = { kind: 'synthetic' } as const;
  const town = Town.create({ townId, simulationProfile });
  expect(town.withBookingMode('live', startsAt)).toEqual({
    ok: false,
    error: { code: 'licence_missing' },
  });
  expect(evaluateBookingCapability(town, startsAt)).toEqual({
    kind: 'simulated',
    townId,
    simulationProfile,
  });
});

it('keeps a Malvan-like Town information-only in its persisted simulated mode', () => {
  const town = Town.create({ townId });
  expect(town.bookingMode).toBe('simulated');
  expect(evaluateBookingCapability(town, startsAt)).toEqual({
    kind: 'information_only',
    reason: 'simulation_profile_missing',
  });
});

it('uses the selected mode when both forms of authority are present', () => {
  const town = Town.create({ townId, licence, simulationProfile: { kind: 'synthetic' } });
  const live = unwrap(town.withBookingMode('live', startsAt));
  expect(evaluateBookingCapability(live, endsAt)).toMatchObject({ kind: 'information_only' });
  const simulated = unwrap(live.withBookingMode('simulated', endsAt));
  expect(evaluateBookingCapability(simulated, endsAt)).toMatchObject({ kind: 'simulated' });
});

it.each([
  { validFromDate: '2026-02-30' },
  { validThroughDate: '2026-11-23' },
  { validThroughDate: '2026-11-25T00:00Z' },
  { ulin: ' ' },
  { issuingAuthority: '' },
])('rejects malformed licence data %o', (invalid) => {
  expect(createLicence({ ...dates, ...invalid })).toEqual({
    ok: false,
    error: { code: 'invalid_licence' },
  });
});

it('includes a single valid calendar day across a month boundary', () => {
  const singleDay = unwrap(
    createLicence({
      ...dates,
      validFromDate: '2026-12-31',
      validThroughDate: '2026-12-31',
    }),
  );
  expect(singleDay.endsAt.epochMilliseconds).toBe(Date.parse('2026-12-31T18:30:00Z'));
});
