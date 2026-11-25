import type { EventLog, RecordedEvent } from '@application/ports/event-log';
import { fromEventLogRow, toEventLogRow } from './event-log.mapper';
import type { PayloadValues } from './payload.mapper';
import type { RepositoryStorage } from './repository-storage';

export class SupabaseEventLog implements EventLog {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: PayloadValues,
  ) {}

  append(value: RecordedEvent) {
    return this.storage.save({
      resource: 'events',
      key: { id: value.eventId },
      row: toEventLogRow(value, this.domain),
      expectedVersion: null,
    });
  }

  async list() {
    const rows = await this.storage.list('events', {});
    return rows.map((row) => fromEventLogRow(row, this.domain));
  }
}
