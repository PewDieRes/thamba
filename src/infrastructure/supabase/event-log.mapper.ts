import type { RecordedEvent } from '@application/ports/event-log';
import type { Tables } from './database.types';
import { readPayload, writeRecordPayload, type PayloadValues } from './payload.mapper';
import { writeRunScope } from './row.mapper';

export type EventLogRow = Pick<
  Tables<'domain_events'>,
  | 'id'
  | 'town_id'
  | 'run_scope_id'
  | 'driver_id'
  | 'event_type'
  | 'booking_id'
  | 'payload'
  | 'occurred_at'
> & { stand_id: string | null };

export function fromEventLogRow(row: EventLogRow, domain: PayloadValues): RecordedEvent {
  return {
    eventId: row.id as RecordedEvent['eventId'],
    event: readPayload(row.payload, domain) as RecordedEvent['event'],
  };
}

export function toEventLogRow(
  { eventId, event }: RecordedEvent,
  domain: PayloadValues,
): EventLogRow {
  return {
    ...writeRunScope(event),
    id: eventId,
    event_type: event.type,
    stand_id: 'standId' in event ? event.standId : null,
    driver_id: 'driverId' in event ? event.driverId : null,
    booking_id: 'bookingId' in event ? (event.bookingId ?? null) : null,
    occurred_at: new Date(event.occurredAt.epochMilliseconds).toISOString(),
    payload: writeRecordPayload(event, domain),
  };
}
