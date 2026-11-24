import { expect, test } from 'vitest';
import type { EventLog, RecordedEvent } from '@application/ports/event-log';
import type { EventId } from '@domain/shared/ids.value-object';
import { NOW, RIDER, SCOPE, uuid } from '../unit/application/demo-data.fixtures';
import { BOOKING_ID } from './contract-data.fixtures';
import { CONFLICT, SAVED, type AdapterFactory } from './versioned-repository.fixtures';

const event: RecordedEvent = {
  eventId: uuid(200) as EventId,
  event: {
    ...SCOPE,
    type: 'BookingRequested',
    actor: { type: 'rider', riderId: RIDER },
    bookingId: BOOKING_ID,
    occurredAt: NOW,
  },
};

export function eventLogContract(make: AdapterFactory<EventLog>) {
  test('EventLog appends one event per identity in commit order', async () => {
    const log = await make();
    expect(await log.list()).toEqual([]);
    expect(await log.append(event)).toEqual(SAVED);
    expect(await log.append(event)).toEqual(CONFLICT);
    const second = { ...event, eventId: uuid(201) as EventId };
    expect(await log.append(second)).toEqual(SAVED);
    expect(await log.list()).toEqual([event, second]);
  });
}
