import type { DomainError } from './domain.error';
import { err, ok } from './result';
import type { Result } from './result';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
declare const ID_BRAND: unique symbol;

type Id<Kind extends string> = string & { readonly [ID_BRAND]: Kind };

export type TownId = Id<'Town'>;
export type DemoRunId = Id<'DemoRun'>;
export type RiderId = Id<'Rider'>;
export type RouteId = Id<'Route'>;
export type StandCoordinatorId = Id<'StandCoordinator'>;
export type StandId = Id<'Stand'>;
export type LandmarkId = Id<'Landmark'>;
export type DriverId = Id<'Driver'>;
export type BookingId = Id<'Booking'>;
export type RideOfferId = Id<'RideOffer'>;
export type TripId = Id<'Trip'>;
export type FareChartId = Id<'FareChart'>;
export type IdError = DomainError<'invalid_id'>;

function createId<Kind extends string>(input: unknown): Result<Id<Kind>, IdError> {
  if (typeof input !== 'string' || !UUID_PATTERN.test(input)) {
    return err({ code: 'invalid_id' });
  }
  return ok(input.toLowerCase() as Id<Kind>);
}

export function createTownId(input: unknown): Result<TownId, IdError> {
  return createId(input);
}

export function createStandId(input: unknown): Result<StandId, IdError> {
  return createId(input);
}

export function createLandmarkId(input: unknown): Result<LandmarkId, IdError> {
  return createId(input);
}

export function createDriverId(input: unknown): Result<DriverId, IdError> {
  return createId(input);
}

export function createBookingId(input: unknown): Result<BookingId, IdError> {
  return createId(input);
}

export function createRideOfferId(input: unknown): Result<RideOfferId, IdError> {
  return createId(input);
}

export function createTripId(input: unknown): Result<TripId, IdError> {
  return createId(input);
}

export function createFareChartId(input: unknown): Result<FareChartId, IdError> {
  return createId(input);
}

export function createDemoRunId(input: unknown): Result<DemoRunId, IdError> {
  return createId(input);
}

export function createRiderId(input: unknown): Result<RiderId, IdError> {
  return createId(input);
}

export function createRouteId(input: unknown): Result<RouteId, IdError> {
  return createId(input);
}

export function createStandCoordinatorId(input: unknown): Result<StandCoordinatorId, IdError> {
  return createId(input);
}
