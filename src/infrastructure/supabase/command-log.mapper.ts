import type { CommandRecord } from '@application/ports/command-log';
import type { Tables } from './database.types';
import { readPayload, writeRecordPayload, type PayloadValues } from './payload.mapper';
import { versioned } from './row.mapper';

export type CommandLogRow = Pick<
  Tables<'command_log'>,
  'actor' | 'command_key' | 'input_hash' | 'result' | 'version'
>;

export function fromCommandLogRow(row: CommandLogRow, domain: PayloadValues) {
  return versioned<CommandRecord>(row, {
    actor: row.actor,
    key: row.command_key,
    inputHash: row.input_hash,
    result: readPayload(row.result, domain) as CommandRecord['result'],
  });
}

export function toCommandLogRow(
  record: CommandRecord,
  domain: PayloadValues,
): Omit<CommandLogRow, 'version'> {
  return {
    actor: record.actor,
    command_key: record.key,
    input_hash: record.inputHash,
    result: writeRecordPayload(record.result, domain),
  };
}
