import { ok } from '@domain/shared/result';
import type { WriteResult } from '../ports/application-result';
import type { EventLog, RecordedEvent } from '../ports/event-log';
import type { IdGenerator } from '../ports/id-generator';

export async function appendEvents(
  log: EventLog,
  ids: IdGenerator,
  events: readonly RecordedEvent['event'][],
): Promise<WriteResult> {
  for (const event of events) {
    const stored = await log.append({ event, eventId: ids.next<'Event'>() });
    if (!stored.ok) return stored;
  }
  return ok(undefined);
}
