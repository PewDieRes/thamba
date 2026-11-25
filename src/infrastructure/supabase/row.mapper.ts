import type { Versioned } from '@application/ports/versioned';
import type { Route } from '@domain/fares/fare-chart';
import type { Instant } from '@domain/shared/instant.value-object';
import type { BookingScope } from '@domain/town/town';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';

export const LIVE_SCOPE_ID = '00000000-0000-0000-0000-000000000000';

export function unpack<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error('Invalid persisted domain value');
  return result.value;
}

export function readInstant(value: string, domain: DomainValues): Instant {
  return unpack(domain.instant(Date.parse(value)));
}

export function writeInstant(value: Instant | undefined): string | null {
  return value === undefined ? null : new Date(value.epochMilliseconds).toISOString();
}

export function mapOptional<Key extends string, Value>(
  key: Key,
  value: Value | null | undefined,
): { [P in Key]?: Value } {
  return value == null ? {} : ({ [key]: value } as { [P in Key]: Value });
}

export function readOptionalInstant<Key extends string>(
  key: Key,
  value: string | null,
  domain: DomainValues,
): { [P in Key]?: Instant } {
  return mapOptional(key, value === null ? undefined : readInstant(value, domain));
}

export function readScope(townId: string, demoRunId: string | null): BookingScope {
  return {
    townId: townId as BookingScope['townId'],
    ...mapOptional('demoRunId', readDemoRun(demoRunId)),
  };
}

function readDemoRun(value: string | null): BookingScope['demoRunId'] {
  return value === null || value === LIVE_SCOPE_ID
    ? undefined
    : (value as BookingScope['demoRunId']);
}

export function writeScope(scope: BookingScope) {
  return { town_id: scope.townId, demo_run_id: scope.demoRunId ?? null };
}

export function writeRunScope(scope: BookingScope) {
  return { town_id: scope.townId, run_scope_id: scope.demoRunId ?? LIVE_SCOPE_ID };
}

export type RouteRow = Pick<Tables<'routes'>, 'pickup_landmark_id' | 'destination_landmark_id'> & {
  route_id: string;
};

export function readRoute(row: RouteRow): Route {
  return {
    routeId: row.route_id as Route['routeId'],
    pickupLandmarkId: row.pickup_landmark_id as Route['pickupLandmarkId'],
    destinationLandmarkId: row.destination_landmark_id as Route['destinationLandmarkId'],
  };
}

export function writeRoute(route: Route): RouteRow {
  return {
    route_id: route.routeId,
    pickup_landmark_id: route.pickupLandmarkId,
    destination_landmark_id: route.destinationLandmarkId,
  };
}

export function versioned<T>(row: { version: number }, value: T): Versioned<T> {
  return { version: row.version, value };
}
