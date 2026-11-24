import type { CommandIdentity, CommandLog, CommandRecord } from '@application/ports/command-log';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

function commandKey({ actor, key }: CommandIdentity): string {
  return JSON.stringify([actor, key]);
}

export class InMemoryCommandLog implements CommandLog {
  constructor(private readonly table = new MemoryTable<CommandRecord>()) {}

  get(identity: CommandIdentity) {
    return Promise.resolve(this.table.get(commandKey(identity)));
  }

  save(record: CommandRecord, expectedVersion: ExpectedVersion) {
    return Promise.resolve(this.table.save(commandKey(record), record, expectedVersion));
  }
}
