import type { BookingActor, BookingEvent } from '@domain/dispatch/booking-events';
import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import type { BookingId, DriverId, EventId, StandId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { BookingScope } from '@domain/town/town';
import type { WriteResult } from './application-result';

export type AvailabilityReason = 'break' | 'offline' | 'skip' | 'walk_up';

export interface DriverQueueChanged extends BookingScope {
  readonly type: 'DriverQueueChanged';
  readonly actor: BookingActor;
  readonly occurredAt: Instant;
  readonly standId: StandId;
  readonly driverId: DriverId;
  readonly bookingId?: BookingId;
  readonly reason:
    | 'available'
    | 'offline'
    | 'break'
    | 'skip'
    | 'walk_up'
    | 'reserved'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'withdrawn';
  readonly availabilityReason?: AvailabilityReason;
  readonly before: DriverQueueEntry;
  readonly after: DriverQueueEntry;
  readonly eligibleDriverIds?: readonly DriverId[];
}

export interface DriverIdentityChanged extends BookingScope {
  readonly type: 'DriverInviteIssued' | 'DriverInviteRedeemed' | 'DriverDeviceRevoked';
  readonly occurredAt: Instant;
  readonly actor: BookingActor;
  readonly standId: StandId;
  readonly driverId: DriverId;
}

export interface RecordedEvent {
  readonly eventId: EventId;
  readonly event: BookingEvent | DriverQueueChanged | DriverIdentityChanged;
}

export interface EventLog {
  append(event: RecordedEvent): Promise<WriteResult>;
  list(): Promise<readonly RecordedEvent[]>;
}
