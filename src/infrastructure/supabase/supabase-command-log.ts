import type { CommandIdentity, CommandLog, CommandRecord } from '@application/ports/command-log';
import type { ExpectedVersion } from '@application/ports/versioned';
import { fromCommandLogRow, toCommandLogRow } from './command-log.mapper';
import type { PayloadValues } from './payload.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseCommandLog implements CommandLog {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: PayloadValues,
  ) {}

  async get({ actor, key }: CommandIdentity) {
    const row = await getRow(this.storage, 'commands', { actor, command_key: key });
    return row && fromCommandLogRow(row, this.domain);
  }

  save(value: CommandRecord, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'commands',
      key: { actor: value.actor, command_key: value.key },
      row: toCommandLogRow(value, this.domain),
      expectedVersion,
    });
  }
}
