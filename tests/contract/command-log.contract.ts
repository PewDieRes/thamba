import type { CommandLog } from '@application/ports/command-log';
import { expect, test } from 'vitest';
import type { CommandRecord } from '@application/ports/command-log';
import {
  CONFLICT,
  SAVED,
  type AdapterFactory,
  versionedRepositoryContract,
} from './versioned-repository.fixtures';

const record: CommandRecord = {
  actor: 'rider:one',
  key: 'request',
  inputHash: 'a'.repeat(64),
  result: { ok: true, value: { bookingId: 'booking' } },
};

export function commandLogContract(make: AdapterFactory<CommandLog>) {
  versionedRepositoryContract({
    name: 'CommandLog',
    make,
    id: { actor: record.actor, key: record.key },
    first: record,
    updated: { ...record, result: { ok: true, value: 'Updated result' } },
  });
  test('CommandLog scopes a key to one actor and retains its input hash and result', async () => {
    const log = await make();
    const other = { ...record, actor: 'rider:two', inputHash: 'b'.repeat(64) };
    expect(await log.save(record, null)).toEqual(SAVED);
    expect(await log.save(other, null)).toEqual(SAVED);
    expect(await log.save({ ...record, inputHash: 'c'.repeat(64) }, null)).toEqual(CONFLICT);
    expect(await log.get(record)).toEqual({ value: record, version: 1 });
    expect(await log.get(other)).toEqual({ value: other, version: 1 });
  });
}
