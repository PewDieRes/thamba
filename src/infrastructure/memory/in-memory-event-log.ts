import type { EventLog, RecordedEvent } from '@application/ports/event-log';
import { MemoryTable } from './memory-table';

export class InMemoryEventLog implements EventLog {
  constructor(private readonly table = new MemoryTable<RecordedEvent>()) {}

  append(event: RecordedEvent) {
    return Promise.resolve(this.table.save(event.eventId, event, null));
  }

  list() {
    return Promise.resolve(this.table.list().map(({ value }) => value));
  }
}
