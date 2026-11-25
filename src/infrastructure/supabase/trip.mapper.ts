import type { Trip } from '@domain/trip/trip';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';
import {
  mapOptional,
  readInstant,
  readOptionalInstant,
  readRoute,
  readScope,
  unpack,
  versioned,
  writeInstant,
  writeRoute,
  writeRunScope,
  type RouteRow,
} from './row.mapper';

export type TripRow = Pick<
  Tables<'trips'>,
  | 'id'
  | 'town_id'
  | 'run_scope_id'
  | 'stand_id'
  | 'booking_id'
  | 'driver_id'
  | 'status'
  | 'accepted_at'
  | 'arrived_at'
  | 'picked_up_at'
  | 'ended_at'
  | 'version'
> &
  RouteRow &
  Pick<Tables<'bookings'>, 'chart_version' | 'fare_in_paise' | 'rider_user_id'>;

export function fromTripRow(row: TripRow, domain: DomainValues) {
  const details = {
    ...readScope(row.town_id, row.run_scope_id),
    tripId: row.id as Trip['tripId'],
    bookingId: row.booking_id as Trip['bookingId'],
    standId: row.stand_id as Trip['standId'],
    driverId: row.driver_id as Trip['driverId'],
    riderId: row.rider_user_id as Trip['riderId'],
    fare: {
      route: readRoute(row),
      amount: unpack(domain.money(row.fare_in_paise)),
      fareChartVersion: row.chart_version,
    },
    acceptedAt: readInstant(row.accepted_at, domain),
    ...readOptionalInstant('arrivedAt', row.arrived_at, domain),
    ...readOptionalInstant('pickedUpAt', row.picked_up_at, domain),
  };
  const status = row.status as Trip['status'];
  const ended = readOptionalInstant('endedAt', row.ended_at, domain);
  if (status === 'accepted' || status === 'driver_arrived' || status === 'in_trip') {
    return versioned<Trip>(row, { ...details, status });
  }
  if (ended.endedAt === undefined) throw new Error('Invalid ended Trip');
  return versioned<Trip>(row, {
    ...details,
    status,
    endedAt: ended.endedAt,
    ...mapOptional('reason', status === 'completed' ? undefined : status),
  } as Trip);
}

export function toTripRow(value: Trip): Omit<TripRow, 'version'> {
  return {
    ...writeRunScope(value),
    id: value.tripId,
    stand_id: value.standId,
    booking_id: value.bookingId,
    driver_id: value.driverId,
    status: value.status,
    accepted_at: new Date(value.acceptedAt.epochMilliseconds).toISOString(),
    arrived_at: writeInstant(value.arrivedAt),
    picked_up_at: writeInstant(value.pickedUpAt),
    ended_at: writeInstant('endedAt' in value ? value.endedAt : undefined),
    ...writeRoute(value.fare.route),
    chart_version: value.fare.fareChartVersion,
    fare_in_paise: value.fare.amount.paise,
    rider_user_id: value.riderId,
  };
}
