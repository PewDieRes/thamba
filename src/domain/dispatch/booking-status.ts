import { TRIP_TRANSITIONS } from '../trip/trip';

export const ALLOWED_TRANSITIONS = {
  scheduled: {
    activate: 'requested',
    closeSchedule: 'no_driver_found',
    cancelByRider: 'cancelled_by_rider',
  },
  requested: {
    issueOffer: 'offering',
    endSearch: 'no_driver_found',
    cancelByRider: 'cancelled_by_rider',
  },
  offering: {
    closeOffer: 'requested',
    acceptOffer: 'accepted',
    endOffering: 'no_driver_found',
    cancelByRider: 'cancelled_by_rider',
  },
  ...TRIP_TRANSITIONS,
  completed: {},
  cancelled_by_rider: {},
  cancelled_by_driver: {},
  no_driver_found: {},
} as const;

export type BookingStatus = keyof typeof ALLOWED_TRANSITIONS;
export type BookingCommand = {
  [Status in BookingStatus]: keyof (typeof ALLOWED_TRANSITIONS)[Status];
}[BookingStatus];

const transitions: Readonly<
  Record<BookingStatus, Readonly<Partial<Record<BookingCommand, BookingStatus>>>>
> = ALLOWED_TRANSITIONS;

export function getBookingTransition(status: BookingStatus, command: BookingCommand) {
  return transitions[status][command];
}

export const ACTIVE_BOOKING_STATUSES = [
  'scheduled',
  'requested',
  'offering',
  'accepted',
  'driver_arrived',
  'in_trip',
] as const satisfies readonly BookingStatus[];

export const MAX_ACTIVE_BOOKINGS_PER_RIDER = 2;
