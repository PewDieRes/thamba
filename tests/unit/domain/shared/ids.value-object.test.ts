import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  createBookingId,
  createDriverId,
  createFareChartId,
  createLandmarkId,
  createRideOfferId,
  createStandId,
  createTownId,
  createTripId,
} from '@domain/shared/ids.value-object';
import type { StandId, TownId } from '@domain/shared/ids.value-object';
import { err, ok } from '@domain/shared/result';

const UUID = 'b2c8e2b1-d866-4f2b-831c-2c86a49358ee';

describe.each([
  ['TownId', createTownId],
  ['StandId', createStandId],
  ['LandmarkId', createLandmarkId],
  ['DriverId', createDriverId],
  ['BookingId', createBookingId],
  ['RideOfferId', createRideOfferId],
  ['TripId', createTripId],
  ['FareChartId', createFareChartId],
] as const)('%s', (_name, createId) => {
  it('returns the canonical UUID used in lexicographic ordering', () => {
    expect(createId(UUID)).toEqual(ok(UUID));
    expect(createId(UUID.toUpperCase())).toEqual(ok(UUID));
  });

  it('rejects blank, malformed and non-string values', () => {
    for (const input of ['', 'demo-town', UUID.replaceAll('-', ''), ` ${UUID}`, null, 1]) {
      expect(createId(input)).toEqual(err({ code: 'invalid_id' }));
    }
  });
});

it('keeps branded IDs distinct from each other and from raw strings', () => {
  expectTypeOf<TownId>().toExtend<string>();
  expectTypeOf<string>().not.toExtend<TownId>();
  expectTypeOf<TownId>().not.toExtend<StandId>();
});
