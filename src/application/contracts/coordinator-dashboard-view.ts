import type { BookingStatus } from '@domain/dispatch/booking-status';
import type { BookingId, DriverId, EventId, StandId } from '@domain/shared/ids.value-object';
import type { AvailabilityReason, DriverQueueChanged } from '../ports/event-log';
import type { Translations } from './town-overview-view';

export type QueueReason = DriverQueueChanged['reason'] | 'cancelled';

export interface QueuePosition {
  readonly driverId: DriverId;
  readonly queuedAt: string | null;
}

export interface CoordinatorDriver extends QueuePosition {
  readonly name: string;
  readonly names: Translations;
  readonly vehicleNumber: string | null;
  readonly availability: 'online' | 'offline' | 'reserved' | 'on_trip';
  readonly tripsToday: number;
  readonly hasDevice: boolean;
  readonly canInvite: boolean;
}

export interface CoordinatorBooking {
  readonly bookingId: BookingId;
  readonly status: BookingStatus;
  readonly pickupAt: number | null;
  readonly fareInPaise: number;
}

export interface QueueChange {
  readonly id: EventId;
  readonly driverId: DriverId;
  readonly before: string | null;
  readonly reason: QueueReason;
  readonly availabilityReason?: AvailabilityReason;
  readonly occurredAt: number;
}

export interface QueueHistoryRow extends QueueChange {
  readonly movements: readonly {
    readonly driverId: DriverId;
    readonly from: number | null;
    readonly to: number | null;
  }[];
}

export interface CoordinatorDashboardView {
  readonly stand: { readonly id: StandId; readonly name: string; readonly names: Translations };
  readonly drivers: readonly (CoordinatorDriver & { readonly position: number | null })[];
  readonly history: readonly QueueHistoryRow[];
  readonly liveBookings: readonly CoordinatorBooking[];
  readonly rides: readonly CoordinatorBooking[];
}
