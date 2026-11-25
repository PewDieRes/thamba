import type {
  CoordinatorDriver,
  DashboardScope,
  DashboardSnapshot,
  QueueChange,
} from '@application/ports/coordinator-dashboard-reader';
import type { RecordedEvent } from '@application/ports/event-log';
import type { ScopedQueueEntry } from '@application/ports/driver-queue-repository';
import type { DriverDevice } from '@domain/identity/driver-device';
import type { Trip } from '@domain/trip/trip';
import type { BookingState, BookingScope } from '@domain/dispatch/booking-state';
import type { StandId } from '@domain/shared/ids.value-object';
import type { MemoryStore } from './memory-store';

type StandScope = BookingScope & { standId: StandId };
type MatchesStand = (scope: StandScope) => boolean;

export function mapMemoryDashboard(
  { tables }: MemoryStore,
  { membership, dayStart, dayEnd }: DashboardScope,
): DashboardSnapshot | undefined {
  const matches: MatchesStand = (item) =>
    item.townId === membership.townId &&
    item.demoRunId === membership.demoRunId &&
    item.standId === membership.standId;
  const stand = tables.stands.get(membership.standId)?.value;
  if (!stand || !matches(stand)) return undefined;
  const trips = tables.trips.list().map(({ value }) => value);
  const devices = tables.devices.list().map(({ value }) => value);
  const drivers = tables.drivers
    .list()
    .map(({ value }) => value)
    .filter(({ entry, ...scope }) => matches({ ...scope, standId: entry.standId }));
  const bookings = tables.bookings.list().map(({ value }) => value.state);
  return {
    stand: { id: stand.standId, name: stand.name ?? stand.standId, names: stand.names ?? {} },
    drivers: drivers
      .map((driver) => mapDriver(driver, { trips, devices, dayStart, dayEnd }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.driverId.localeCompare(b.driverId)),
    bookings: mapBookings(bookings, trips, matches),
    changes: tables.events
      .list()
      .map(({ value }) => value)
      .flatMap((item) =>
        item.event.type === 'DriverQueueChanged' && matches(item.event) ? mapChange(item) : [],
      ),
  };
}

function mapBookings(
  bookings: readonly BookingState[],
  trips: readonly Trip[],
  matches: MatchesStand,
) {
  const tripStands = new Map(trips.map((trip) => [trip.bookingId, trip.standId]));
  return bookings
    .filter((booking) => {
      const relatedStand = tripStands.get(booking.bookingId) ?? booking.offer?.standId;
      return (
        matches(booking) ||
        (relatedStand !== undefined && matches({ ...booking, standId: relatedStand }))
      );
    })
    .map((booking) => ({
      bookingId: booking.bookingId,
      status: booking.status,
      pickupAt: (booking.pickupAt ?? booking.requestedAt)?.epochMilliseconds ?? null,
      fareInPaise: booking.fare.amount.paise,
    }))
    .sort(
      (a, b) =>
        (b.pickupAt ?? -Infinity) - (a.pickupAt ?? -Infinity) ||
        a.bookingId.localeCompare(b.bookingId),
    );
}

interface DriverContext {
  trips: readonly Trip[];
  devices: readonly DriverDevice[];
  dayStart: number;
  dayEnd: number;
}

function mapDriver(
  { entry, demoDriver, demoRunId }: ScopedQueueEntry,
  context: DriverContext,
): CoordinatorDriver {
  const { trips, devices, dayStart, dayEnd } = context;
  const ownTrips = trips.filter((trip) => trip.driverId === entry.driverId);
  const availability = getAvailability(entry, ownTrips);
  const hasDevice = devices.some(
    (device) => device.driverId === entry.driverId && device.status === 'active',
  );
  return {
    driverId: entry.driverId,
    name: demoDriver?.name ?? entry.driverId,
    names: demoDriver?.names ?? {},
    vehicleNumber: demoDriver?.vehicleNumber ?? null,
    queuedAt: entry.availability === 'online' ? entry.queuedAt.toString() : null,
    hasDevice,
    tripsToday: ownTrips.filter((trip) => wasCompletedToday(trip, { dayStart, dayEnd })).length,
    availability,
    canInvite:
      demoRunId !== undefined && !hasDevice && ['online', 'offline'].includes(availability),
  };
}

function getAvailability(entry: ScopedQueueEntry['entry'], trips: readonly Trip[]) {
  if (trips.some((trip) => !('endedAt' in trip))) return 'on_trip';
  if (entry.availability === 'online' && entry.reservation) return 'reserved';
  return entry.availability;
}

function wasCompletedToday(
  trip: Trip,
  { dayStart, dayEnd }: Pick<DriverContext, 'dayStart' | 'dayEnd'>,
) {
  return (
    trip.status === 'completed' &&
    trip.endedAt.epochMilliseconds >= dayStart &&
    trip.endedAt.epochMilliseconds < dayEnd
  );
}

function mapChange({ eventId, event }: RecordedEvent): QueueChange[] {
  if (event.type !== 'DriverQueueChanged') return [];
  return [
    {
      id: eventId,
      driverId: event.driverId,
      occurredAt: event.occurredAt.epochMilliseconds,
      reason:
        event.reason === 'withdrawn' && event.actor.type === 'rider' ? 'cancelled' : event.reason,
      before: event.before.availability === 'online' ? event.before.queuedAt.toString() : null,
      ...(event.availabilityReason === undefined
        ? {}
        : { availabilityReason: event.availabilityReason }),
    },
  ];
}
