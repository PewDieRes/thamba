import { expect, test } from 'vitest';
import type { RecordedEvent } from '@application/ports/event-log';
import type { EventId } from '@domain/shared/ids.value-object';
import { domainValues } from '@infrastructure/composition/domain-values';
import { fromEventLogRow, toEventLogRow } from '@infrastructure/supabase/event-log.mapper';
import { NOW, RIDER, SCOPE, uuid } from '../../application/demo-data.fixtures';
import { BOOKING_ID } from '../../../contract/contract-data.fixtures';

test('keeps the event identity and scope when a Booking event has no Stand field', () => {
  const event: RecordedEvent = {
    eventId: uuid(200) as EventId,
    event: {
      ...SCOPE,
      bookingId: BOOKING_ID,
      type: 'BookingRequested',
      actor: { type: 'rider', riderId: RIDER },
      occurredAt: NOW,
    },
  };
  const row = toEventLogRow(event, domainValues);
  expect(row.stand_id).toBeNull();
  expect(row.booking_id).toBe(BOOKING_ID);
  expect(fromEventLogRow(row, domainValues)).toEqual(event);
});
